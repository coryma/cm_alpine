({
	navigateToRecord : function(component, recordId, objectApiName) {
		if (!recordId) {
			return;
		}

		var navService = component.find('navService');
		var pageReference = {
			type: 'standard__recordPage',
			attributes: {
				recordId: recordId,
				objectApiName: objectApiName,
				actionName: 'view'
			}
		};

		navService.navigate(pageReference);
	}
})
