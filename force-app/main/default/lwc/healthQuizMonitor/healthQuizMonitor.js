import { LightningElement } from 'lwc';
import { onError, subscribe, unsubscribe } from 'lightning/empApi';
import getRecentSessions from '@salesforce/apex/HealthQuizProgressController.getRecentSessions';
import { QUIZ_STEP_COUNT, getQuizIconUrl } from 'c/healthLifestyleQuizCatalog';

const CHANNEL_NAME = '/event/Health_Quiz_Progress__e';
const HASH_COLORS = ['#2563eb', '#0f766e', '#9333ea', '#ea580c', '#db2777', '#0f172a', '#14b8a6'];

export default class HealthQuizMonitor extends LightningElement {
    isLoading = true;
    errorMessage = '';
    sessionRows = [];
    subscription;
    errorListenerRegistered = false;

    connectedCallback() {
        this.initialize();
        this.registerErrorListener();
    }

    disconnectedCallback() {
        if (this.subscription) {
            unsubscribe(this.subscription, () => {});
            this.subscription = null;
        }
    }

    get hasSessions() {
        return this.sessionRows.length > 0;
    }

    get totalEventCount() {
        return this.sessionRows.reduce((sum, session) => sum + session.icons.length, 0);
    }

    get activeSessionCount() {
        return this.sessionRows.length;
    }

    get subscriptionState() {
        return this.subscription ? '已連線' : '等待中';
    }

    async initialize() {
        this.isLoading = true;
        this.errorMessage = '';

        try {
            await this.loadSessions();
            await this.subscribeToProgress();
        } catch (error) {
            this.errorMessage = reduceError(error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadSessions() {
        const payload = await getRecentSessions({ limitSize: 50 });
        this.sessionRows = (payload || []).map((session) => normalizeSession(session));
    }

    async subscribeToProgress() {
        if (this.subscription) {
            return;
        }

        this.subscription = await subscribe(CHANNEL_NAME, -1, (event) => {
            this.handleProgressEvent(event?.data?.payload || {});
        });
    }

    registerErrorListener() {
        if (this.errorListenerRegistered) {
            return;
        }

        onError((error) => {
            this.errorMessage = reduceError(error);
        });
        this.errorListenerRegistered = true;
    }

    async handleRefresh() {
        this.errorMessage = '';
        this.isLoading = true;

        try {
            await this.loadSessions();
        } catch (error) {
            this.errorMessage = reduceError(error);
        } finally {
            this.isLoading = false;
        }
    }

    handleProgressEvent(payload) {
        const update = normalizeProgressPayload(payload);
        if (!update) {
            return;
        }

        const rowsBySessionKey = new Map(this.sessionRows.map((row) => [row.sessionKey, { ...row }]));
        const existingRow = rowsBySessionKey.get(update.sessionKey) || createEmptySession(update);
        const nextIcons = mergeIcons(existingRow.icons, update.icon);

        rowsBySessionKey.set(update.sessionKey, {
            ...existingRow,
            displayLabel: update.displayLabel,
            avatarText: update.displayLabel.slice(0, 1).toUpperCase(),
            avatarStyle: `background:${colorForText(update.displayLabel)};`,
            iconCount: nextIcons.length,
            icons: nextIcons,
            progressLabel: `${nextIcons.length} / ${QUIZ_STEP_COUNT}`,
            statusText: update.isComplete
                ? '已完成完整問卷'
                : `最新完成第 ${update.stepNumber} 步`,
            bundleName: update.bundleName || existingRow.bundleName || '',
            isComplete: update.isComplete,
            sortTimestamp: Date.now()
        });

        this.sessionRows = Array.from(rowsBySessionKey.values()).sort((left, right) => right.sortTimestamp - left.sortTimestamp);
    }
}

function normalizeSession(session) {
    const displayLabel = session?.displayLabel || 'anonymous';
    const icons = (session?.steps || [])
        .map((step) => ({
            stepNumber: step.stepNumber,
            title: `第 ${step.stepNumber} 步 · ${step.optionLabel || step.stepKey || '已完成'}`,
            alt: step.optionLabel || step.stepKey || '問卷選擇',
            url: getQuizIconUrl(step.iconKey, step.optionLabel || displayLabel)
        }))
        .sort((left, right) => left.stepNumber - right.stepNumber);

    return {
        id: session?.id,
        sessionKey: session?.sessionKey,
        displayLabel,
        avatarText: displayLabel.slice(0, 1).toUpperCase(),
        avatarStyle: `background:${colorForText(displayLabel)};`,
        statusText: session?.isComplete ? '已完成完整問卷' : `目前完成 ${icons.length} 個步驟`,
        progressLabel: `${icons.length} / ${QUIZ_STEP_COUNT}`,
        bundleName: session?.bundleName || '',
        isComplete: session?.isComplete,
        icons,
        iconCount: icons.length,
        sortTimestamp: session?.lastEventAt ? new Date(session.lastEventAt).getTime() : 0
    };
}

function normalizeProgressPayload(payload) {
    const sessionKey = normalizeString(payload?.Session_Key__c);
    if (!sessionKey) {
        return null;
    }

    const stepNumber = Number(payload?.Step_Number__c || 0);
    return {
        sessionKey,
        displayLabel: normalizeString(payload?.Display_Label__c) || sessionKey.slice(0, 8),
        stepNumber,
        isComplete: payload?.Is_Complete__c === true,
        bundleName: normalizeString(payload?.Bundle_Name__c),
        icon: {
            stepNumber,
            title: `第 ${stepNumber} 步 · ${normalizeString(payload?.Option_Label__c) || normalizeString(payload?.Step_Key__c) || '已完成'}`,
            alt: normalizeString(payload?.Option_Label__c) || '問卷選擇',
            url: getQuizIconUrl(payload?.Icon_Key__c, normalizeString(payload?.Option_Label__c))
        }
    };
}

function createEmptySession(update) {
    return {
        sessionKey: update.sessionKey,
        displayLabel: update.displayLabel,
        avatarText: update.displayLabel.slice(0, 1).toUpperCase(),
        avatarStyle: `background:${colorForText(update.displayLabel)};`,
        statusText: '',
        progressLabel: `0 / ${QUIZ_STEP_COUNT}`,
        bundleName: '',
        isComplete: false,
        icons: [],
        iconCount: 0,
        sortTimestamp: 0
    };
}

function mergeIcons(existingIcons, incomingIcon) {
    const iconsByStep = new Map((existingIcons || []).map((icon) => [icon.stepNumber, icon]));
    iconsByStep.set(incomingIcon.stepNumber, incomingIcon);
    return Array.from(iconsByStep.values()).sort((left, right) => left.stepNumber - right.stepNumber);
}

function colorForText(value) {
    const text = normalizeString(value) || 'quiz';
    const index =
        Array.from(text).reduce((sum, character) => sum + character.charCodeAt(0), 0) % HASH_COLORS.length;
    return HASH_COLORS[index];
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function reduceError(error) {
    if (Array.isArray(error?.body)) {
        return error.body.map((item) => item.message).join(', ');
    }

    if (error?.body?.message) {
        return error.body.message;
    }

    if (error?.message) {
        return error.message;
    }

    return '即時 monitor 暫時無法載入。';
}
