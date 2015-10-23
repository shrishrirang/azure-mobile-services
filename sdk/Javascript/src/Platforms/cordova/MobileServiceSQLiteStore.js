// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Platform = require('Platforms/Platform'),
    Validate = require('../../Utilities/Validate'),
    _ = require('../../Utilities/Extensions'),
    queryHelper = require('azure-mobile-apps/src/query'),
    SQLiteTypes = require('./SQLiteTypes'),
    SQLiteHelper = require('./SQLiteHelper'),
    Query = require('query.js').Query,
    formatSql = require('azure-mobile-apps/src/data/sql/query/format');

var idPropertyName = "id";

var MobileServiceSQLiteStore = function (dbName) {
    /// <summary>
    /// Initializes a new instance of the MobileServiceSQLiteStore class.
    /// </summary>

    this._db = window.sqlitePlugin.openDatabase({ name: dbName });
    this._tableDefinitions = {}; //ttodoshrirs: review prototype props vs instance props

    this.defineTable = Platform.async(function (tableDefinition, callback) {
        /// <summary>Defines the local table in the sqlite store</summary>
        /// <param name="tableDefinition">Table definition object defining the table name and columns
        /// Example of a valid tableDefinition object:
        /// tableDefinition : {
        ///     name: "todoItemTable",
        ///     columnDefinitions : {
        ///         id : "string",
        ///         metadata : MobileServiceSQLiteStore.ColumnType.Object,
        ///         description : "string",
        ///         purchaseDate : "date",
        ///         price : MobileServiceSQLiteStore.ColumnType.Real
        ///     }
        /// }
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Ensure 'defineTable' has been invoked with exactly 1 argument.
        // As Platform.async silently appends a callback argument to the original list of arguments,
        // we expect the arugment length to be 2.
        Validate.length(arguments, 2, 'arguments');

        Validate.notNull(callback, 'callback');

        Validate.notNull(tableDefinition, 'tableDefinition');
        Validate.isString(tableDefinition.name, 'tableDefinition.name');
        Validate.notNullOrEmpty(tableDefinition.name, 'tableDefinition.name');

        this._tableDefinitions[tableDefinition.name] = tableDefinition;
        var columnDefinitions = tableDefinition.columnDefinitions;

        // Validate the specified column types
        for (var columnName in columnDefinitions) {
            var columnType = columnDefinitions[columnName];

            Validate.isString(columnType, 'columnType');
            Validate.notNullOrEmpty(columnType, 'columnType');
        }

        this._db.transaction(function(transaction) {

            var pragmaStatement = _.format("PRAGMA table_info({0});", tableDefinition.name);

            transaction.executeSql(pragmaStatement, [], function (transaction, result) {

                // If table already exists, add missing columns, if any.
                // Else, create the table
                if (result.rows.length > 0) {

                    // Columns that are present in the table already
                    var existingColumns = {};

                    // Remove columns that are already present in the table from the columnDefinitions array
                    for (var i = 0; i < result.rows.length; i++) {
                        var column = result.rows.item(i);
                        existingColumns[column.name] = true;
                    }

                    addMissingColumns(transaction, tableDefinition, existingColumns);

                } else {
                    createTable(transaction, tableDefinition);
                }
            });

        }, function (error) {
            callback(error);
        }, function(result) {
            callback();
        });
    });

    this.upsert = Platform.async(function (tableName, instances, callback) {
        /// <summary>Updates or inserts one or more objects in the local table</summary>
        /// <param name="tableName">Name of the local table in which the object is to be upserted</param>
        /// <param name="instances">Object OR array of objects to be inserted/updated in the table</param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Ensure 'upsert' has been invoked with exactly 2 arguments.
        // As Platform.async silently appends a callback argument to the original list of arguments,
        // we expect the arugment length to be 3.
        Validate.length(arguments, 3, 'arguments');

        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        var tableDefinition = this._tableDefinitions[tableName];
        Validate.notNull(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');

        if (_.isNull(instances)) {
            callback();
            return;
        }

        Validate.isObject(instances);

        if (!_.isArray(instances)) {
            instances = [instances];
        }

        for (var i = 0; i < instances.length; i++) {

            if (!_.isNull(instances[i])) {
                Validate.isValidId(instances[i][idPropertyName], 'instances[' + i + '].' + idPropertyName);
                instances[i] = SQLiteHelper.serialize(instances[i], columnDefinitions);
            }
        }

        // Note: The default maximum number of parameters allowed by sqlite is 999
        // See: http://www.sqlite.org/limits.html#max_variable_number
        // TODO(shrirs): Add support for tables with more than 999 columns

        // Insert and update SQL statements and their parameters corresponding to each record we want to insert/update in the table.
        var insertStatements = [],
            updateStatements = [],
            insertParameters = [],
            updateParameters = [];

        var columnNames, columnParams, updateClause, insertValues, updateValues, property, instance;
        for (i = 0; i < instances.length; i++) {
            columnNames = '';
            columnParams = '';
            updateClause = '';
            insertValues = [];
            updateValues = [];
            instance = instances[i];

            for (property in instance) {
                if (columnNames !== '') {
                    columnNames += ', ';
                    columnParams += ', ';
                }

                if (updateClause !== '') {
                    updateClause += ', ';
                }

                columnNames += property;
                columnParams += '?';

                if (property !== idPropertyName) {
                    updateClause += property + ' = ?';
                    updateValues.push(instance[property]);
                }

                insertValues.push(instance[property]);
            }

            updateValues.push(instance[idPropertyName]);

            insertStatements.push(_.format("INSERT OR IGNORE INTO {0} ({1}) VALUES ({2})", tableName, columnNames, columnParams));
            updateStatements.push(_.format("UPDATE {0} SET {1} WHERE {2} = ? COLLATE NOCASE", tableName, updateClause, idPropertyName));

            insertParameters.push(insertValues);
            updateParameters.push(updateValues);
        }

        this._db.transaction(function (transaction) {

            var i;
            for (i = 0; i < insertParameters.length; i++) {
                transaction.executeSql(insertStatements[i], insertParameters[i]);
                transaction.executeSql(updateStatements[i], updateParameters[i]);
            }
        }, function (error) {
            callback(error);
        }, function () {
            callback();
        });
    });

    // TODO(shrirs): Implement equivalents of readWithQuery and deleteUsingQuery
    this.lookup = Platform.async(function (tableName, id, callback) {
        /// <summary>Perform a lookup against a local table</summary>
        /// <param name="tableName">Name of the local table in which look up is to be performed</param>
        /// <param name="id">ID of the object to be looked up</param>
        /// <returns type="Promise">
        /// A promise that is resolved with the looked up object when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Ensure 'lookup' has been invoked with exactly 2 arguments.
        // As Platform.async silently appends a callback argument to the original list of arguments,
        // we expect the arugment length to be 3.
        Validate.length(arguments, 3, 'arguments');

        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        Validate.isValidId(id, 'id');
        
        var tableDefinition = this._tableDefinitions[tableName];
        Validate.notNull(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');

        var lookupStatement = _.format("SELECT * FROM [{0}] WHERE {1} = ? COLLATE NOCASE", tableName, idPropertyName);

        this._db.executeSql(lookupStatement, [id], function (result) {

            try {
                var instance = null;
                if (result.rows.length !== 0) {
                    instance = result.rows.item(0);
                }

                instance = SQLiteHelper.deserialize(instance, columnDefinitions);
                callback(null, instance);
            } catch (err) {
                callback(err);
            }
        }, function (err) {
            callback(err);
        });
    });

    //TODO(shrirs): instance needs to be an array instead of an object
    //ttodoshrirs: input should either be a queryjs object or an array of ids
    //ttodoshrirs: update upstream table, synccontext methods in line with changes to this file
    this.del = Platform.async(function (tableNameOrQuery, ids) {
        /// <summary>Deletes records from the local table</summary>
        /// <param name="tableNameOrQuery">Name of the local table in which delete is to be performed OR a queryjs object defining records to be deleted</param>
        /// <param name="ids">A single ID or and array of IDs of records to be deleted. This argument is expected only if the first argument is table name</param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        var tableName,
            query,
            callback = Array.prototype.pop.apply(arguments); // Extract the callback argument added by Platform.async.

        // Redefine function arguments to account for the popped callback
        tableNameOrQuery = arguments[0];
        ids = arguments[1];

        Validate.isFunction(callback);
        Validate.notNull(tableNameOrQuery);

        if (_.isString(tableNameOrQuery)) {
            Validate.notNullOrEmpty(tableNameOrQuery, 'tableNameOrQuery');
            tableName = tableNameOrQuery;

            if (_.isNull(ids)) {
                callback();
                return;
            } else if (!_.isArray(ids)) {
                // If a single id is specified, convert it to an array and proceed
                ids = [ids];
            }
        } else if (_.isObject(tableNameOrQuery)) {
            query = tableNameOrQuery;

        } else {
            throw _.format(
                Platform.getResourceString("TypeCheckError"),
                'tableNameOrQuery',
                'Object or String',
                typeof tableNameOrQuery);
        }

        //ttodoshrirs: this is not javascript convention. suggestion: use last arg as callback and use the rest as tableName, instances, etc. do this for all methods in this file. also remove callback from param list? may be?

        if (query) {
            this.read(query).then(function (records) {

                try {
                    ids = records.map(function (record) {
                        return records[idPropertyName];
                    });
                    deleteIds(query.getComponents().table, ids, callback);
                } catch (error) {
                    callback(error);
                }
            }, function (error) {
                callback(error);
            });
        } else {
            this._del(tableName, ids, callback);
        }
    });

    // move this out of this or not? //ttodoshrirs
    this._del = function (tableName, ids, callback) {
        // Delete SQL statements corresponding to each record we want to delete from the table.
        var deleteStatements = [],
            deleteParams = [];

        for (var i = 0; i < ids.length; i++) {
            if (!_.isNull(ids[i])) {
                Validate.isValidId(ids[i]);
                deleteStatements.push(_.format("DELETE FROM {0} WHERE {1} = ? COLLATE NOCASE", tableName, idPropertyName));
                deleteParams.push([ids[i]]);
            }
        }

        this._db.transaction(function (transaction) {
            for (i = 0; i < deleteStatements.length; i++) {
                transaction.executeSql(deleteStatements[i], deleteParams[i]);
            }
        }, function (error) {
            callback(error);
        }, function () {
            callback();
        });
    }

    // move this out of this or not? //ttodoshrirs
    function getStatementParameters(statement) {
        var params = [];

        if (statement.parameters) {
            statement.parameters.forEach(function (param) {
                params.push(param.value);
            });
        }

        return params;
    }

    this.read = Platform.async(function (query, callback) {
        /// <summary>
        /// Read a table
        /// </summary>
        /// <param name="query" type="Object">
        /// A QueryJS object representing the query to be performed while reading the table.
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved with the read results when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Ensure 'read' has been invoked with exactly 1 argument.
        // As Platform.async silently appends a callback argument to the original list of arguments,
        // we expect the arugment length to be 2.
        Validate.length(arguments, 2, 'arguments');

        Validate.notNull(query, 'query');
        Validate.isObject(query, 'query');

        var tableDefinition = this._tableDefinitions[query.getComponents().table];
        Validate.notNull(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');

        var count,
            result = [],
            odataQuery = queryHelper.toOData(query),
            statements = formatSql(odataQuery, { flavor: 'sqlite' });

        this._db.transaction(function (transaction) {

            if (statements.length < 1 || statements.length > 2) {
                throw Platform.getResourceString("MobileServiceSQLiteStore_UnexptedNumberOfStatements");
            }

            transaction.executeSql(statements[0].sql, getStatementParameters(statements[0]), function (transaction, res) {

                var row;
                for (var j = 0; j < res.rows.length; j++) {

                    row = SQLiteHelper.deserialize(res.rows.item(j), columnDefinitions);
                    result.push(row);
                }
            });

            // Check if there are multiple statements. If yes, the second is for the result count.
            if (statements.length === 2) {
                transaction.executeSql(statements[1].sql, getStatementParameters(statements[1]), function (transaction, res) {
                    count = res.rows.item(0).count;
                });
            }
        }, function (error) {
            callback(error);
        }, function () {
            if (count !== undefined) {
                result = {
                    result: result,
                    count: count
                };
            }
            callback(null, result);
        });
    });
};

function createTable(transaction, tableDefinition) {
    var columnDefinitions = tableDefinition.columnDefinitions;
    var columnDefinitionClauses = [];

    for (var columnName in columnDefinitions) {
        var columnType = columnDefinitions[columnName];

        var columnDefinitionClause = _.format("[{0}] {1}", columnName, SQLiteHelper.getColumnAffinity(columnType));

        // TODO(shrirs): Handle cases where id property may be missing
        if (columnName === idPropertyName) {
            columnDefinitionClause += " PRIMARY KEY";
        }

        columnDefinitionClauses.push(columnDefinitionClause);
    }

    var createTableStatement = _.format("CREATE TABLE [{0}] ({1})", tableDefinition.name, columnDefinitionClauses.join());

    transaction.executeSql(createTableStatement);
}

// Add missing columns to the table
function addMissingColumns(transaction, tableDefinition, existingColumns) {

    // SQLite does not support adding multiple columns using a single statement; Add one column at a time
    var columnDefinitions = tableDefinition.columnDefinitions;
    for (var columnName in columnDefinitions) {

        // If this column does not already exist, we need to create it
        if (!existingColumns[columnName]) {
            var alterStatement = _.format("ALTER TABLE {0} ADD COLUMN {1} {2}", tableDefinition.name, columnName, columnDefinitions[columnName]);
            transaction.executeSql(alterStatement);
        }
    }
}

// Valid SQL types
MobileServiceSQLiteStore.ColumnType = SQLiteTypes.ColumnType;

// Export
Platform.addToMobileServicesClientNamespace({ MobileServiceSQLiteStore: MobileServiceSQLiteStore });
Platform.addToMobileServicesClientNamespace({ Query: Query });

exports.MobileServiceSQLiteStore = MobileServiceSQLiteStore;
