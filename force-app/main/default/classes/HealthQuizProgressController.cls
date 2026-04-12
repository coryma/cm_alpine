public without sharing class HealthQuizProgressController {
    @AuraEnabled
    public static HealthQuizProgressService.ProgressAck recordProgress(
        HealthQuizProgressService.ProgressInput payload
    ) {
        return HealthQuizProgressService.recordProgress(payload);
    }

    @AuraEnabled
    public static HealthQuizProgressService.ProgressAck recordProgressJson(String payloadJson) {
        if (String.isBlank(payloadJson)) {
            throw new AuraHandledException('請提供問卷進度資料。');
        }

        HealthQuizProgressService.ProgressInput payload =
            (HealthQuizProgressService.ProgressInput) JSON.deserialize(
                payloadJson,
                HealthQuizProgressService.ProgressInput.class
            );

        return HealthQuizProgressService.recordProgress(payload);
    }

    @AuraEnabled(cacheable=true)
    public static List<HealthQuizProgressService.SessionView> getRecentSessions(Integer limitSize) {
        return HealthQuizProgressService.getRecentSessions(limitSize);
    }
}
