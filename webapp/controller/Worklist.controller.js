sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "../model/formatter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/FilterType",
  "sap/ui/core/Fragment",
  "sap/ui/model/Sorter",
  "sap/m/ViewSettingsDialog",
  "sap/m/ViewSettingsItem",
  "sap/ui/core/format/DateFormat"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, FilterType, Fragment, Sorter, ViewSettingsDialog, ViewSettingsItem, DateFormat) {
  "use strict";

  return BaseController.extend("sapui5.worklist.custint.controller.Worklist", {

    formatter: formatter,

    /* =========================================================== */
    /* lifecycle methods                                           */
    /* =========================================================== */

    /**
     * Called when the worklist controller is instantiated.
     * @public
     */
    onInit: function () {
      var oViewModel = new JSONModel({
        worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
        shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
        shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
        tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
        newInstruction: {
          InstructionShort: "",
          InstructionLong: "",
          ToSubprojectTypeInstructions: []
        }
      });

      this.setModel(oViewModel, "worklistView");
      this.setModel(oViewModel, "subprojectTypes");
    },

    /* =========================================================== */
    /* event handlers                                              */
    /* =========================================================== */

    /**
     * Triggered by the table's 'updateFinished' event: after new table
     * data is available, this handler method updates the table counter.
     * This should only happen if the update was successful, which is
     * why this handler is attached to 'updateFinished' and not to the
     * table's list binding's 'dataReceived' method.
     * @param {sap.ui.base.Event} oEvent the update finished event
     * @public
     */
    onUpdateFinished: function (oEvent) {
      // update the worklist's object counter after the table update
      var sTitle,
        oTable = oEvent.getSource(),
        iTotalItems = oEvent.getParameter("total");
      // only update the counter if the length is final and
      // the table is not empty
      if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
        sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
      } else {
        sTitle = this.getResourceBundle().getText("worklistTableTitle");
      }
      this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
    },

    /**
     * Event handler when a table item gets pressed
     * @param {sap.ui.base.Event} oEvent the table selectionChange event
     * @public
     */
    onPress: function (oEvent) {
      // The source is the list item that got pressed
      this._showObject(oEvent.getSource());
    },

    /**
     * Event handler for navigating back.
     * Navigate back in the browser history
     * @public
     */
    onNavBack: function () {
      // eslint-disable-next-line fiori-custom/sap-no-history-manipulation, fiori-custom/sap-browser-api-warning
      history.go(-1);
    },




    onSearch: function() {
      var oView = this.getView();
      var sValue = oView.byId("searchField").getValue();
      var oTable = oView.byId("table");

      var oBinding = oTable.getBinding("items");

      if (sValue) {
        var oFilterInstructionShort = new Filter("InstructionShort", FilterOperator.Contains, sValue);
        var oFilterInstructionId = new Filter("InstructionId", FilterOperator.Contains, sValue);
        var oFilterChUser = new Filter("ChUser", FilterOperator.Contains, sValue);
        var oFilterChData = new Filter("ChData", FilterOperator.Contains, sValue);

        var oCombinedFilter = new Filter({
          filters: [oFilterInstructionShort, oFilterInstructionId, oFilterChUser, oFilterChData],
          and: false
        });

        oBinding.filter(oCombinedFilter);
      } else {
        oBinding.filter([]);
      }
    },

    /**
     * Event handler for refresh event. Keeps filter, sort
     * and group settings and refreshes the list binding.
     * @public
     */
    onRefresh: function () {
      var oTable = this.byId("table");
      oTable.getBinding("items").refresh();
    },

    /* =========================================================== */
    /* internal methods                                            */
    /* =========================================================== */

    /**
     * Shows the selected item on the object page
     * @param {sap.m.ObjectListItem} oItem selected Item
     * @private
     */
    _showObject: function (oItem) {
      this.getRouter().navTo("object", {
        objectId: oItem.getBindingContext().getPath().substring("/Instructions".length)
      });
    },

    onOpenCreateDialog: function () {
      var oView = this.getView();

      if (!this.byId("createDialog")) {
        Fragment.load({
          id: oView.getId(),
          name: "sapui5.worklist.custint.view.fragments.CreateDialog",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          oDialog.open();
        });
      } else {
        this.byId("createDialog").open();
      }
    },

    onCreatePress: function () {
      var oView = this.getView();
      var oTable = oView.byId("table");
      var oModel = this.getModel();

      var oNewInstruction = oView.getModel("worklistView").getProperty("/newInstruction");

      // Validate the form fields
      if (!this._validateForm(oNewInstruction)) {
        return; // Abort creation if the form is not valid
      }

      // Create a new instruction
      oModel.create("/Instructions", oNewInstruction, {
        success: function (oCreatedInstruction) {
          // Update the table with the newly created instruction
          oTable.getModel().refresh();

          // Close the dialog
          oView.byId("createDialog").close();

          oNewInstruction.ToSubprojectTypeInstructions.forEach((sType) => {
            oModel.create("/SubprojectTypeInstructions", {
              SubprjType: sType,
              InstructionId: oCreatedInstruction.InstructionId,
            }, {
              success: function (oData) {
                console.log(oData);
              },
              error: function (oError) {
                console.log(oData);
              }
            });
          })




        },
        error: function (oError) {
          MessageToast.show("No new instruction has been created");
        }
      });
    },

    _validateForm: function (oNewInstruction) {
      var oValidateModel = this.getOwnerComponent().getModel("validateModel");

      // Validate the fields of the new instruction
      var isValid = true;
      oValidateModel.setProperty("/InstructionShortValueState", !oNewInstruction.InstructionShort ? "Error" : "None");
      oValidateModel.setProperty("/InstructionLongValueState", !oNewInstruction.InstructionLong ? "Error" : "None");
      oValidateModel.setProperty("/ToSubprojectTypeInstructionsValueState", oNewInstruction.ToSubprojectTypeInstructions.length === 0 ? "Error" : "None");

      // Check if any of the fields have an error value state
      if (
        oValidateModel.getProperty("/InstructionShortValueState") === "Error" ||
        oValidateModel.getProperty("/InstructionLongValueState") === "Error" ||
        oValidateModel.getProperty("/ToSubprojectTypeInstructionsValueState") === "Error"
      ) {
        isValid = false;
      }

      return isValid;
    },


    onCancelPress: function () {
      this.byId("createDialog").close();
    },

    onSortPress: function () {
      if (!this._oViewSettingsDialog) {
        this._oViewSettingsDialog = new ViewSettingsDialog({
          confirm: this.onSortConfirm.bind(this)
        });

        // Create sort items as buttons in the dialog
        this._oViewSettingsDialog.addSortItem(
          new ViewSettingsItem({ text: "Instruction ID", key: "InstructionId" })
        );
        this._oViewSettingsDialog.addSortItem(
          new ViewSettingsItem({ text: "Short Description", key: "InstructionShort" })
        );
        this._oViewSettingsDialog.addSortItem(
          new ViewSettingsItem({ text: "Last Changed By", key: "LastChangedBy" })
        );
      }

      var oTable = this.byId("table");

      // Set the dialog model
      this._oViewSettingsDialog.setModel(oTable.getModel(), oTable.getBindingInfo("items").model);

      // Open the dialog
      this._oViewSettingsDialog.open();
    },

    onSortConfirm: function (oEvent) {
      var oTable = this.byId("table");
      var mParams = oEvent.getParameters();
      var oBinding = oTable.getBinding("items");
      var aSorters = [];

      // Get the selected sort item
      var sSortKey = mParams.sortItem.getKey();
      var bSortDescending = mParams.sortDescending;

      // Create the sorter object based on the selected sort item
      if (sSortKey) {
        // Additional handling for Last Changed By sorting
        if (sSortKey === "LastChangedBy") {
          aSorters.push(new Sorter({
            path: sSortKey,
            descending: bSortDescending,
            comparator: function (a, b) {
              var sLastChangedByA = oTable.getModel().getProperty(a.getBindingContextPath()).LastChangedBy;
              var sLastChangedByB = oTable.getModel().getProperty(b.getBindingContextPath()).LastChangedBy;
              return sLastChangedByA.localeCompare(sLastChangedByB);
            }
          }));
        } else {
          aSorters.push(new Sorter(sSortKey, bSortDescending));
        }
      }

      // Apply the sorting to the table
      oBinding.sort(aSorters);
    }


  });
});
