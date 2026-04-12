({
    closeModal:function(component,event,helper){    
        var cmpTarget = component.find('Modalbox');
        var cmpBack = component.find('Modalbackdrop');
        $A.util.removeClass(cmpBack,'slds-backdrop--open');
        $A.util.removeClass(cmpTarget, 'slds-fade-in-open'); 
        
        
    },
    statusChange : function (cmp, event) {
        if (event.getParam('status') === "FINISHED") {
            var flow = component.find("flow");
            flow.destroy();
            var cmpTarget = cmp.find('Modalbox');
            var cmpBack = cmp.find('Modalbackdrop');
            $A.util.removeClass(cmpBack,'slds-backdrop--open');
            $A.util.removeClass(cmpTarget, 'slds-fade-in-open'); 
        }
  	},
    openmodal: function(component,event,helper) {
        
      /*  var cmpTarget = component.find('Modalbox');
        var cmpBack = component.find('Modalbackdrop');
        $A.util.addClass(cmpTarget, 'slds-fade-in-open');
        $A.util.addClass(cmpBack, 'slds-backdrop--open'); 
        $A.createComponent("lightning:flow",
            {
                "aura:id": "flow"
            },
        	 function(flowcmp, status, errorMessage){
                //Add the new button to the body array
                if (status === "SUCCESS") {
                    var body = component.get("v.body");
                    body.push(flowcmp);
                    component.set("v.body", body);
                    var flow = component.find("flow");
    				flow.startFlow("Opportunity_Creation_Flow");
                }
                else if (status === "INCOMPLETE") {
                    console.log("No response from server or client is offline.");
                    // Show offline error
                }
                else if (status === "ERROR") {
                    console.log("Error: " + errorMessage);
                    // Show error message
                }
            }                  
        );*/

      // window.location.href="https://tpmrcgido244-15.lightning.force.com/lightning/r/cgcloud__Account_Plan__c/a068e000000BwlzAAC/view";
      window.location.href="https://tpmrcgido244-15.lightning.force.com/lightning/r/cgcloud__Account_Plan__c/a068e000000BwlzAAC/view";
    },
    openDistributionReporting : function(){
        window.location.href="https://tpmrcgido244-15.lightning.force.com/lightning/r/cgcloud__Account_Plan__c/a068e000000BwlzAAC/view";
    },
    openProduct : function(component,event,helper) {
        helper.navigateToRecord(component, component.get('v.productRecordId'), 'Product2');
    },
    launchQuickAction :function(component,event,helper) {
        console.log('hello');
    	var actionAPI = cmp.find("quickActionAPI");
        var args = { actionName : "Account.Create_Opportunity", 
                     entityName : "Account"};
        actionAPI.setActionFieldValues(args).then(function() {
            actionAPI.invokeAction(args);
        }).catch(function(e) {
            console.error(e.errors);
        });
  
	}

})
