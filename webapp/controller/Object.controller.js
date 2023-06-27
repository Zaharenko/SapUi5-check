sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, History, formatter, MessageBox, MessageToast) {
    "use strict";

    return BaseController.extend("sapui5.worklist.custint.controller.Object", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        onInit: function () {
            this.oPageModel = this.getOwnerComponent().getModel("objectPageModel");
            var oViewModel = new JSONModel({
                editable: false // Initial state: not editable
            });
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "objectView");
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        onNavBack: function () {
            history.go(-1);
        },

        onDeletePress: function () {
            var oElementBinding = this.getView().getElementBinding();
            var oObject = oElementBinding && oElementBinding.getBoundContext().getObject();

            if (oObject) {
                var sPath = oElementBinding.getPath();
                var oModel = this.getModel();

                MessageBox.confirm("Are you sure you want to delete this instruction?", {
                    title: "Delete",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            oModel.remove(sPath, {
                                success: function () {
                                    MessageToast.show("Instruction deleted successfully", { closeOnBrowserNavigation: false });
                                    this.getRouter().navTo("worklist");
                                }.bind(this),
                                error: function () {
                                    MessageToast.show("Failed to delete the instruction");
                                }
                            });
                        }
                    }.bind(this)
                });
            }
        },

        onEditPress: function () {
            this.oPageModel.setProperty("/isEditMode", true);
        },

        onCancelPress: function () {
            var oElementBinding = this.getView().getElementBinding();
            var oModel = this.getView().getModel();

            if (oElementBinding) {
                oModel.resetChanges();
                this.oPageModel.setProperty("/isEditMode", false);
                oElementBinding.refresh();
            }
        },

        formatChDate: function (oChDate) {
            if (oChDate) {
                var oDateFormat = sap.ui.core.format.DateFormat.getInstance({ pattern: "dd/MM/yyyy HH:mm" });
                return oDateFormat.format(oChDate);
            }
            return "";
        },

        onSavePress: function () {
            var oElementBinding = this.getView().getElementBinding();
            var oObject = oElementBinding && oElementBinding.getBoundContext().getObject();
            var oPageModel = this.getModel("objectPageModel");

            if (!this._validateForm()) {
                return;
            }

            if (oObject) {
                var oModel = this.getModel();
                var that = this;

                oObject.ChDate = new Date();


                oModel.update(oElementBinding.getPath(), oObject, {
                    success: function () {
                        var aSubprojectTypeInstructionsSelectedKeys = oPageModel.getProperty("/ToSubprojectTypeInstructions");
                        aSubprojectTypeInstructionsSelectedKeys.forEach((sType) => {
                            oModel.update("/SubprojectTypeInstructions", {
                                SubprjType: sType,
                                InstructionId: oObject.InstructionId,
                            }, {
                                success: function (oData) {
                                    console.log(oData);
                                },
                                error: function (oError) {
                                    console.log(oData);
                                }
                            });
                        })

                        that.oPageModel.setProperty("/isEditMode", false);
                        sap.m.MessageToast.show("Changes saved successfully", { closeOnBrowserNavigation: false });

                        oElementBinding.refresh();

                        var oComponent = that.getOwnerComponent();
                        var oWorklistController = oComponent && oComponent.getRootControl().getController();
                        var oTable = oWorklistController && oWorklistController.getView().byId("table");

                        if (oTable) {
                            oTable.unbindItems();
                            oTable.bindItems({
                                path: "/Instructions",
                                template: oTable.getBindingInfo("items").template
                            });
                        } else {
                            sap.m.MessageToast.show("Table not found in Worklist view");
                        }
                    },
                    error: function () {
                        sap.m.MessageToast.show("Failed to save changes");
                    }
                });
            }
        },

        _validateForm: function () {
            var oValidateModel = this.getOwnerComponent().getModel("validateModel");
            var oInstructionShort = this.getView().byId("instructionShortInput");
            var oInstructionLong = this.getView().byId("instructionLongTextArea");
            var oInstructionSelect = this.getView().byId("instructionSelect");
            var sInstructionShortValue = oInstructionShort.getValue();
            var sInstructionLongValue = oInstructionLong.getValue();
            var oInstructionSelect = oInstructionLong.getValue();
        
            var isValid = true;
            oValidateModel.setProperty("/InstructionShort", sInstructionShortValue ? "" : "Error");
            oValidateModel.setProperty("/ToSubprojectTypeInstructionsValueState", oInstructionSelect ? "" : "Error");
            oValidateModel.setProperty("/InstructionLong", sInstructionLongValue ? "" : "Error");
            oInstructionShort.setValueState(oValidateModel.getProperty("/InstructionShort") === "Error" ? "Error" : "None");
        
            if (oValidateModel.getProperty("/InstructionShort") === "Error" || oValidateModel.getProperty("/InstructionLong") === "Error" || oValidateModel.getProperty("/ToSubprojectTypeInstructionsValueState") === "Error") {
                isValid = false;
                oInstructionLong.addStyleClass("errorInput");
            } else {
                oInstructionLong.removeStyleClass("errorInput");
            }
        
            return isValid;
        },
        
        

        _onObjectMatched: function (oEvent) {
            this.oPageModel.setProperty("/isEditMode", false);
            var sObjectId = oEvent.getParameter("arguments").objectId;
            this._bindView("/Instructions" + sObjectId);
        },

        _bindView: function (sObjectPath) {
            var oViewModel = this.getModel("objectView");

            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });

            this.getModel().read(sObjectPath + "/ToSubprojectTypeInstructions", {
                success: function (oData) {
                    var aSelectedSubprojectTypes = oData.results.map(function (oItem) {
                        return oItem.SubprjType;
                    });

                    this.oPageModel.setProperty("/ToSubprojectTypeInstructions", aSelectedSubprojectTypes);
                }.bind(this),
                error: function (oError) {
                    console.log(oError)
                }
            })
        },

        _onBindingChange: function () {
            var oView = this.getView(),
                oViewModel = this.getModel("objectView"),
                oElementBinding = oView.getElementBinding();

            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("objectNotFound");
                return;
            }

            var oResourceBundle = this.getResourceBundle(),
                oObject = oView.getBindingContext().getObject(),
                sObjectId = oObject.InstructionId,
                sObjectName = oObject.Instructions;

            oViewModel.setProperty("/busy", false);
            oViewModel.setProperty("/shareSendEmailSubject",
                oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
            oViewModel.setProperty("/shareSendEmailMessage",
                oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
        }
    });
});