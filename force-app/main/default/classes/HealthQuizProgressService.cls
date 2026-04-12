public without sharing class HealthQuizProgressService {
    @TestVisible
    private static final Integer DEFAULT_SESSION_LIMIT = 40;
    @TestVisible
    private static final Integer MAX_SESSION_LIMIT = 80;

    public class ProgressInput {
        @AuraEnabled public String sessionKey;
        @AuraEnabled public String displayLabel;
        @AuraEnabled public Integer stepNumber;
        @AuraEnabled public String stepKey;
        @AuraEnabled public String optionKey;
        @AuraEnabled public String optionLabel;
        @AuraEnabled public String iconKey;
        @AuraEnabled public Integer completedSteps;
        @AuraEnabled public Boolean isComplete;
        @AuraEnabled public String bundleName;
    }

    public class ProgressAck {
        @AuraEnabled public Id sessionId;
        @AuraEnabled public Integer completedSteps;
        @AuraEnabled public Boolean success;
    }

    public class StepView {
        @AuraEnabled public Integer stepNumber;
        @AuraEnabled public String stepKey;
        @AuraEnabled public String optionKey;
        @AuraEnabled public String optionLabel;
        @AuraEnabled public String iconKey;
        @AuraEnabled public Datetime occurredAt;
    }

    public class SessionView {
        @AuraEnabled public Id id;
        @AuraEnabled public String sessionKey;
        @AuraEnabled public String displayLabel;
        @AuraEnabled public Integer completedSteps;
        @AuraEnabled public Boolean isComplete;
        @AuraEnabled public String bundleName;
        @AuraEnabled public Datetime lastEventAt;
        @AuraEnabled public List<StepView> steps;

        public SessionView() {
            steps = new List<StepView>();
        }
    }

    public static ProgressAck recordProgress(ProgressInput payload) {
        validateProgressPayload(payload);

        Datetime occurredAt = Datetime.now();
        Health_Quiz_Session__c sessionRecord = new Health_Quiz_Session__c(
            Name = buildSessionName(payload.displayLabel),
            Session_Key__c = normalizeString(payload.sessionKey),
            Display_Label__c = buildDisplayLabel(payload.displayLabel, payload.sessionKey),
            Completed_Steps__c = normalizeCount(payload.completedSteps, payload.stepNumber),
            Is_Complete__c = payload.isComplete == true,
            Last_Event_At__c = occurredAt,
            Latest_Bundle_Name__c = normalizeString(payload.bundleName)
        );
        upsert sessionRecord Session_Key__c;

        Health_Quiz_Step__c stepRecord = new Health_Quiz_Step__c(
            Name = buildStepName(payload),
            Session__c = sessionRecord.Id,
            Step_Unique_Key__c = buildStepUniqueKey(payload.sessionKey, payload.stepNumber),
            Step_Number__c = payload.stepNumber,
            Step_Key__c = normalizeString(payload.stepKey),
            Option_Key__c = normalizeString(payload.optionKey),
            Option_Label__c = normalizeString(payload.optionLabel),
            Icon_Key__c = normalizeString(payload.iconKey),
            Occurred_At__c = occurredAt
        );
        upsert stepRecord Step_Unique_Key__c;

        publishProgressEvent(payload);

        ProgressAck response = new ProgressAck();
        response.sessionId = sessionRecord.Id;
        response.completedSteps = normalizeCount(payload.completedSteps, payload.stepNumber);
        response.success = true;
        return response;
    }

    public static List<SessionView> getRecentSessions(Integer limitSize) {
        Integer safeLimit = normalizeSessionLimit(limitSize);
        List<Health_Quiz_Session__c> sessionRecords = [
            SELECT
                Id,
                Session_Key__c,
                Display_Label__c,
                Completed_Steps__c,
                Is_Complete__c,
                Latest_Bundle_Name__c,
                Last_Event_At__c,
                (
                    SELECT
                        Step_Number__c,
                        Step_Key__c,
                        Option_Key__c,
                        Option_Label__c,
                        Icon_Key__c,
                        Occurred_At__c
                    FROM Quiz_Steps__r
                    ORDER BY Step_Number__c ASC
                )
            FROM Health_Quiz_Session__c
            ORDER BY Last_Event_At__c DESC NULLS LAST
            LIMIT :safeLimit
        ];

        List<SessionView> sessions = new List<SessionView>();
        for (Health_Quiz_Session__c sessionRecord : sessionRecords) {
            SessionView session = new SessionView();
            session.id = sessionRecord.Id;
            session.sessionKey = sessionRecord.Session_Key__c;
            session.displayLabel = sessionRecord.Display_Label__c;
            session.completedSteps = sessionRecord.Completed_Steps__c == null
                ? 0
                : Integer.valueOf(sessionRecord.Completed_Steps__c);
            session.isComplete = sessionRecord.Is_Complete__c;
            session.bundleName = sessionRecord.Latest_Bundle_Name__c;
            session.lastEventAt = sessionRecord.Last_Event_At__c;

            for (Health_Quiz_Step__c stepRecord : sessionRecord.Quiz_Steps__r) {
                StepView step = new StepView();
                step.stepNumber = stepRecord.Step_Number__c == null ? 0 : Integer.valueOf(stepRecord.Step_Number__c);
                step.stepKey = stepRecord.Step_Key__c;
                step.optionKey = stepRecord.Option_Key__c;
                step.optionLabel = stepRecord.Option_Label__c;
                step.iconKey = stepRecord.Icon_Key__c;
                step.occurredAt = stepRecord.Occurred_At__c;
                session.steps.add(step);
            }

            sessions.add(session);
        }

        return sessions;
    }

    private static void publishProgressEvent(ProgressInput payload) {
        Health_Quiz_Progress__e progressEvent = new Health_Quiz_Progress__e(
            Session_Key__c = normalizeString(payload.sessionKey),
            Display_Label__c = buildDisplayLabel(payload.displayLabel, payload.sessionKey),
            Step_Number__c = payload.stepNumber,
            Step_Key__c = normalizeString(payload.stepKey),
            Option_Key__c = normalizeString(payload.optionKey),
            Option_Label__c = normalizeString(payload.optionLabel),
            Icon_Key__c = normalizeString(payload.iconKey),
            Completed_Steps__c = normalizeCount(payload.completedSteps, payload.stepNumber),
            Is_Complete__c = payload.isComplete == true,
            Bundle_Name__c = normalizeString(payload.bundleName)
        );
        Database.SaveResult publishResult = EventBus.publish(progressEvent);
        if (publishResult == null || !publishResult.isSuccess()) {
            throwHandledException('問卷即時事件送出失敗。');
        }
    }

    private static void validateProgressPayload(ProgressInput payload) {
        if (payload == null) {
            throwHandledException('請提供問卷進度資料。');
        }

        if (String.isBlank(normalizeString(payload.sessionKey))) {
            throwHandledException('缺少問卷 session key。');
        }

        if (payload.stepNumber == null || payload.stepNumber <= 0) {
            throwHandledException('缺少有效的步驟序號。');
        }

        if (String.isBlank(normalizeString(payload.stepKey))) {
            throwHandledException('缺少步驟 key。');
        }

        if (String.isBlank(normalizeString(payload.optionKey))) {
            throwHandledException('缺少選項 key。');
        }
    }

    private static Integer normalizeSessionLimit(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit <= 0) {
            return DEFAULT_SESSION_LIMIT;
        }

        return Math.min(requestedLimit, MAX_SESSION_LIMIT);
    }

    private static Integer normalizeCount(Integer completedSteps, Integer stepNumber) {
        Integer normalizedStepNumber = stepNumber == null ? 0 : stepNumber;
        if (completedSteps == null || completedSteps < normalizedStepNumber) {
            return normalizedStepNumber;
        }
        return completedSteps;
    }

    private static String buildSessionName(String displayLabel) {
        String normalizedDisplayLabel = normalizeString(displayLabel);
        return String.isBlank(normalizedDisplayLabel) ? 'Quiz Session' : normalizedDisplayLabel;
    }

    private static String buildDisplayLabel(String displayLabel, String sessionKey) {
        String normalizedDisplayLabel = normalizeString(displayLabel);
        if (!String.isBlank(normalizedDisplayLabel)) {
            return normalizedDisplayLabel;
        }

        String normalizedSessionKey = normalizeString(sessionKey);
        if (String.isBlank(normalizedSessionKey)) {
            return 'anonymous';
        }

        return normalizedSessionKey.length() <= 8 ? normalizedSessionKey : normalizedSessionKey.substring(0, 8);
    }

    private static String buildStepName(ProgressInput payload) {
        return buildDisplayLabel(payload.displayLabel, payload.sessionKey) + ' - Step ' + String.valueOf(payload.stepNumber);
    }

    private static String buildStepUniqueKey(String sessionKey, Integer stepNumber) {
        return normalizeString(sessionKey) + ':' + String.valueOf(stepNumber);
    }

    private static String normalizeString(String value) {
        return value == null ? '' : value.trim();
    }

    private static void throwHandledException(String message) {
        throw new AuraHandledException(message);
    }
}
