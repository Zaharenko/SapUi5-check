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

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit: function () {
            this.oPageModel = this.getOwnerComponent().getModel("objectPageModel");
            // Model used to manipulate control states.
            var oViewModel = new JSONModel({
                editable: false // Initial state: not editable
            });
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "objectView");
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Event handler for navigating back.
         * It there is a history entry we go one step back in the browser history.
         * If not, it will replace the current entry of the browser history with the worklist route.
         * @public
         */
        onNavBack: function () {
            history.go(-1);
        },

        /**
         * Event handler for the Edit button press.
         * Enables the edit mode for the form fields.
         * @public
         */
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

        /**
         * Event handler for the Edit button press.
         * @public
         */
        onEditPress: function () {
            this.oPageModel.setProperty("/isEditMode", true);
        },

        /**
         * Event handler for the Cancel button press.
         * @public
         */
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

        /**
         * Event handler for the Save button press.
         * @public
         */
        onSavePress: function () {
            var oElementBinding = this.getView().getElementBinding();
            var oObject = oElementBinding && oElementBinding.getBoundContext().getObject();

            if (oObject) {
                var oModel = this.getModel();
                var that = this;

                // Update the ChDate field with the current date
                var currentDate = new Date();
                oObject.ChDate = currentDate;

                oModel.update(oElementBinding.getPath(), oObject, {
                    success: function () {
                        that.oPageModel.setProperty("/isEditMode", false);
                        MessageToast.show("Changes saved successfully", { closeOnBrowserNavigation: false });

                        // Refresh the binding context to display the updated data
                        oElementBinding.refresh();

                        var oComponent = that.getOwnerComponent();
                        var oWorklistController = oComponent && oComponent.getAggregation("rootControl").getController();
                        var oTable = oWorklistController && oWorklistController.getView().byId("table");

                        if (oTable) {
                            // Clear and rebind the table to the updated model data
                            oTable.unbindItems();
                            oTable.bindItems({
                                path: "/Instructions",
                                template: oTable.getBindingInfo("items").template
                            });
                        } else {
                            MessageToast.show("Table not found in Worklist view");
                        }

                        that.getRouter().navTo("worklist");
                    },
                    error: function () {
                        MessageToast.show("Failed to save changes");
                    }
                });
            }
        }
        ,


        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Binds the view to the object path.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function (oEvent) {
            this.oPageModel.setProperty("/isEditMode", false);
            var sObjectId = oEvent.getParameter("arguments").objectId;
            this._bindView("/Instructions" + sObjectId);
        },

        /**
         * Binds the view to the object path.
         * @function
         * @param {string} sObjectPath path to the object to be bound
         * @private
         */
        _bindView: function (sObjectPath) {
            var oViewModel = this.getModel("objectView");

            this.getView().bindElement({
                path: sObjectPath,
                expand: "ToSubprojectTypeInstructions",
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
        },

        _onBindingChange: function () {
            var oView = this.getView(),
                oViewModel = this.getModel("objectView"),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
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
