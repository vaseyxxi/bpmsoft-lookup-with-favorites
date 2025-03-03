define("BaseEntityPage", ["RightUtilities"], function (RightUtilities) {
	return {
		messages: {},
		attributes: {},
		mixins: {},
		methods: {
			getMultiLookupPageConfig: function (args, columnName) {
				const isFavoritesLookup = this.getIsFavoritesLookup(columnName);
				let multiLookupColumns = this.getMultiLookupColumns(columnName);
				if (isFavoritesLookup) {
					multiLookupColumns = [columnName, columnName];
				}

				const multiLookupConfig = multiLookupColumns.map((column) => {
					let config = this.getLookupPageConfig(args, column);
					config = {
						...config,
						columnName,
						columnValue: this.get(columnName),
						multiLookupColumnName: column,
					};

					const lookupDefValues = this.getLookupValuePairs(column);
					if (lookupDefValues) {
						config.valuePairs = this.Ext.Array.merge(config.valuePairs || [], lookupDefValues);
					}

					if (isFavoritesLookup) {
						config.lookupName = config.entitySchemaName;
					}

					return config;
				}, this);

				if (isFavoritesLookup) {
					const filters = this.Ext.create("BPMSoft.FilterGroup");
					const subFilters = this.Ext.create("BPMSoft.FilterGroup");

					subFilters.addItem(
						BPMSoft.createColumnFilterWithParameter(
							BPMSoft.ComparisonType.EQUAL,
							"Contact",
							BPMSoft.SysValue.CURRENT_USER_CONTACT,
						),
					);
					subFilters.addItem(
						BPMSoft.createColumnFilterWithParameter(
							BPMSoft.ComparisonType.EQUAL,
							"LookupSchemaName",
							multiLookupConfig[1].entitySchemaName,
						),
					);

					filters.addItem(BPMSoft.createExistsFilter("[LookupFavorites:RecordId:Id].Id", subFilters));

					multiLookupConfig[1].filters = filters;
					multiLookupConfig[1].isFavoritesLookup = true;
					multiLookupConfig[1].lookupName = `${multiLookupConfig[1].entitySchemaName}Favorites`;
				}

				return {
					lookupPageName: isFavoritesLookup ? "FavoritesLookupModule" : "MultiLookupModule",
					multiLookupConfig,
				};
			},

			getIsFavoritesLookup: function (columnName) {
				const column = this.getColumnByName(columnName);
				return column?.isFavoritesLookup || false;
			},

			loadVocabulary: function (args, columnName) {
				const isFavoritesLookup = this.getIsFavoritesLookup(columnName);
				const config =
					Ext.isEmpty(this.getMultiLookupColumns(columnName)) && !isFavoritesLookup
						? this.getLookupPageConfig(args, columnName)
						: this.getMultiLookupPageConfig(args, columnName);

				this.openLookup(config, this.onLookupResult, this);
			},
		},
		diff: /**SCHEMA_DIFF*/ [] /**SCHEMA_DIFF*/,
	};
});
