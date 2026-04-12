@IsTest
private class HealthQuizProgressControllerTest {
    @IsTest
    static void recordsQuizProgressAndReturnsRecentSessions() {
        HealthQuizProgressService.ProgressInput payload = new HealthQuizProgressService.ProgressInput();
        payload.sessionKey = 'session-alpha';
        payload.displayLabel = 'alpha1234';
        payload.stepNumber = 1;
        payload.stepKey = 'goal';
        payload.optionKey = 'energy';
        payload.optionLabel = '白天更有精神';
        payload.iconKey = 'goal-energy';
        payload.completedSteps = 1;
        payload.isComplete = false;

        Test.startTest();
        HealthQuizProgressService.ProgressAck firstAck = HealthQuizProgressController.recordProgress(payload);

        payload.stepNumber = 2;
        payload.stepKey = 'rhythm';
        payload.optionKey = 'office';
        payload.optionLabel = '久坐工作日';
        payload.iconKey = 'rhythm-office';
        payload.completedSteps = 2;
        HealthQuizProgressController.recordProgress(payload);

        payload.stepNumber = 5;
        payload.stepKey = 'support';
        payload.optionKey = 'steady';
        payload.optionLabel = '穩定一點';
        payload.iconKey = 'support-steady';
        payload.completedSteps = 5;
        payload.isComplete = true;
        payload.bundleName = '工作日續航穩定配方';
        HealthQuizProgressController.recordProgress(payload);

        List<HealthQuizProgressService.SessionView> sessions = HealthQuizProgressController.getRecentSessions(10);
        Test.stopTest();

        System.assertEquals(true, firstAck.success);
        System.assertEquals(1, sessions.size());
        System.assertEquals('alpha1234', sessions[0].displayLabel);
        System.assertEquals(5, sessions[0].completedSteps);
        System.assertEquals(true, sessions[0].isComplete);
        System.assertEquals('工作日續航穩定配方', sessions[0].bundleName);
        System.assertEquals(3, sessions[0].steps.size());
        System.assertEquals('goal-energy', sessions[0].steps[0].iconKey);
        System.assertEquals('support-steady', sessions[0].steps[2].iconKey);
    }

    @IsTest
    static void updatesExistingStepWhenSameStepNumberReplays() {
        String payloadJson =
            '{"sessionKey":"session-replay","displayLabel":"replay001","stepNumber":1,"stepKey":"goal","optionKey":"energy","optionLabel":"白天更有精神","iconKey":"goal-energy","completedSteps":1,"isComplete":false}';

        Test.startTest();
        HealthQuizProgressController.recordProgressJson(payloadJson);
        HealthQuizProgressController.recordProgressJson(
            '{"sessionKey":"session-replay","displayLabel":"replay001","stepNumber":1,"stepKey":"goal","optionKey":"balance","optionLabel":"節奏更穩定","iconKey":"goal-balance","completedSteps":1,"isComplete":false}'
        );
        List<Health_Quiz_Step__c> steps = [
            SELECT Option_Key__c, Icon_Key__c
            FROM Health_Quiz_Step__c
            WHERE Step_Unique_Key__c = 'session-replay:1'
        ];
        Test.stopTest();

        System.assertEquals(1, steps.size());
        System.assertEquals('balance', steps[0].Option_Key__c);
        System.assertEquals('goal-balance', steps[0].Icon_Key__c);
    }
}
