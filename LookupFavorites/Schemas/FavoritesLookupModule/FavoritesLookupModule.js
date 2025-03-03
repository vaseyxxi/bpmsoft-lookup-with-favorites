define("FavoritesLookupModule", [
	"LookupPage",
	"LookupPageViewGenerator",
	"MultiLookupModule",
	"LookupUtilities",
	"css!LookupPageCSS",
], function (LookupPage, LookupPageViewGenerator) {
	return Ext.define("BPMSoft.configuration.FavoritesLookupModule", {
		alternateClassName: "BPMSoft.FavoritesLookupModule",
		extend: "BPMSoft.MultiLookupModule",

		allFavorites: [],

		onTabChanged: function (activeTab) {
			this.get("LookupsInfo").forEach((lookupInfo) => {
				if (activeTab.get("Name") === lookupInfo.lookupName) {
					this.lookupInfo = lookupInfo;
					this.getSchemaAndProfile(lookupInfo.lookupPostfix, (entitySchema, profile) => {
						this.isClearGridData = true;
						this.set("gridProfile", profile);
						this.entitySchema = entitySchema;
						this.initLoadedColumns();

						const searchColumn = this.get("searchColumn");
						if (!entitySchema.columns[searchColumn.value]) {
							this.set("searchColumn", {
								value: this.entitySchema.primaryDisplayColumn.name,
								displayValue: this.entitySchema.primaryDisplayColumn.caption,
							});
							this.set("searchData", "");
						}

						this.set("LookupInfo", this.lookupInfo);
						this.load(profile, () => this.updateTabContent(this.lookupInfo));
					});
				}
			}, this);
		},

		getTabCaption: function (lookupInfo) {
			if (lookupInfo.isFavoritesLookup) {
				return this._getCaptionFromStructure("LookupFavorites") || this._getCaptionFromManager("LookupFavorites");
			}
			return (
				lookupInfo.caption ||
				this._getCaptionFromStructure(lookupInfo.entitySchemaName) ||
				this._getCaptionFromManager(lookupInfo.entitySchemaName)
			);
		},

		loadLookups: function (callback) {
			const lookupsInfo = this.lookupsInfo || this.getLookupInfo();
			this.loadAllFavorites(lookupsInfo);
			this.viewModel.set("LookupsInfo", lookupsInfo);
			this.viewModel.prepareResponseCollection = this.prepareResponseCollection.bind(this);

			const tabCollection = Ext.create("BPMSoft.Collection");
			lookupsInfo.forEach((lookupInfo, index) => {
				tabCollection.add(lookupInfo.lookupName, {
					Id: index,
					Name: lookupInfo.lookupName,
					Caption: this.getTabCaption(lookupInfo),
				});
			}, this);

			callback(tabCollection);
		},

		loadAllFavorites: function (lookupsInfo) {
			const select = Ext.create("BPMSoft.EntitySchemaQuery", {
				rootSchemaName: "LookupFavorites",
			});
			select.addColumn("RecordId");
			select.filters.add(
				"ContactFilter",
				BPMSoft.createColumnFilterWithParameter(BPMSoft.ComparisonType.EQUAL, "Contact", BPMSoft.SysValue.CURRENT_USER_CONTACT),
			);
			select.filters.add(
				"LookupSchemaNameFilter",
				BPMSoft.createColumnFilterWithParameter(BPMSoft.ComparisonType.EQUAL, "LookupSchemaName", lookupsInfo[0].entitySchemaName),
			);

			select.getEntityCollection((response) => {
				response.collection.each((item) => {
					const id = item.get("RecordId");
					this.addStarButton(id, true);
					this.allFavorites.push(id);
				}, this);
			}, this);
		},

		prepareResponseCollection: function (dataCollection) {
			const gridCollection = this.viewModel.getGridData();
			const fixedCollection = Ext.create("BPMSoft.Collection");

			dataCollection.each((item) => {
				const itemKey = item.get(item.primaryColumnName);
				if (!gridCollection.contains(itemKey) && !fixedCollection.contains(itemKey)) {
					fixedCollection.add(itemKey, item);
				}
			});

			gridCollection.loadAll(fixedCollection);
			gridCollection.each((item) => this.addStarButton(item.get("Id"), this.allFavorites.includes(item.get("Id"))), this);

			return Ext.create("BPMSoft.Collection");
		},

		addStarButton: function (guid, enabled) {
			const selector = `[id$="${guid}"]`;
			const $element = $(selector);

			if ($element.length) {
				const star = enabled ? "★" : "☆";
				const scope = this;

				const $starButton = $('<div class="star-button grid-fixed-col">' + star + "</div>")
					.css({
						cursor: "pointer",
						"font-size": "20px",
						color: enabled ? "gold" : "#888",
						"margin-top": "0px",
					})
					.on("click", function (e) {
						e.stopPropagation();
						const $this = $(this);

						if ($this.text() === "☆") {
							$this.text("★").css("color", "gold");
							scope.addToFavorites(guid);
						} else {
							$this.text("☆").css("color", "#888");
							scope.removeFromFavorites(guid);
						}
					});

				$element.prepend($starButton);
			}
		},

		addToFavorites: function (id) {
			const insert = Ext.create("BPMSoft.InsertQuery", { rootSchemaName: "LookupFavorites" });
			insert.setParameterValue("RecordId", id, BPMSoft.DataValueType.GUID);
			insert.setParameterValue("Contact", BPMSoft.SysValue.CURRENT_USER_CONTACT, BPMSoft.DataValueType.GUID);
			insert.setParameterValue("LookupSchemaName", this.lookupsInfo[0].entitySchemaName, BPMSoft.DataValueType.TEXT);
			insert.execute(() => this.allFavorites.push(id), this);
		},

		removeFromFavorites: function (id) {
			const deleteQuery = Ext.create("BPMSoft.DeleteQuery", { rootSchemaName: "LookupFavorites" });
			deleteQuery.filters.add(
				"RecordIdFilter",
				deleteQuery.createColumnFilterWithParameter(BPMSoft.ComparisonType.EQUAL, "RecordId", id),
			);
			deleteQuery.execute(() => {
				const index = this.allFavorites.indexOf(id);
				if (index > -1) {
					this.allFavorites.splice(index, 1);
				}
			}, this);
		},
	});
});
