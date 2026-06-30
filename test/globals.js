// This is used by the test/plugins tests
/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('webgme/test/_globals'),
    WEBGME_CONFIG_PATH = '../config';

var WebGME = testFixture.WebGME,
    gmeConfig = require(WEBGME_CONFIG_PATH),
    getGmeConfig = function () {
        'use strict';
        if (!gmeConfig) {
            gmeConfig = require(WEBGME_CONFIG_PATH);
        }
        return JSON.parse(JSON.stringify(gmeConfig));
    };

WebGME.addToRequireJsPaths(gmeConfig);

testFixture.getGmeConfig = getGmeConfig;

function usesMemoryGmeAuth(gmeConfigParameter) {
    var authPath = gmeConfigParameter.authentication.gmeAuth.path || '';
    return authPath.indexOf('memorygmeauth') !== -1;
}

function loadGmeAuthClass(gmeConfigParameter) {
    return require(gmeConfigParameter.authentication.gmeAuth.path);
}

function authorizeProjects(gmeAuth, gmeConfigParameter, projectNameOrNames) {
    var guestAccount = gmeConfigParameter.authentication.guestAccount,
        projectAuthParams = {
            entityType: gmeAuth.authorizer.ENTITY_TYPES.PROJECT
        },
        projectsToAuthorize = [],
        projectName,
        projectId,
        i;

    if (typeof projectNameOrNames === 'string') {
        projectName = projectNameOrNames;
        projectId = guestAccount + testFixture.STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
        projectsToAuthorize.push(
            gmeAuth.authorizer.setAccessRights(guestAccount, projectId, {
                read: true,
                write: true,
                delete: true
            }, projectAuthParams)
        );
    } else if (projectNameOrNames instanceof Array) {
        for (i = 0; i < projectNameOrNames.length; i += 1) {
            projectId = guestAccount + testFixture.STORAGE_CONSTANTS.PROJECT_ID_SEP + projectNameOrNames[i];
            projectsToAuthorize.push(
                gmeAuth.authorizer.setAccessRights(guestAccount, projectId, {
                    read: true,
                    write: true,
                    delete: true
                }, projectAuthParams)
            );
        }
    }

    return testFixture.Q.allDone(projectsToAuthorize);
}

function getMemoryGMEAuth(gmeConfigParameter, projectNameOrNames, callback) {
    var GmeAuthClass = loadGmeAuthClass(gmeConfigParameter),
        gmeAuth = new GmeAuthClass(null, gmeConfigParameter),
        guestAccount = gmeConfigParameter.authentication.guestAccount;

    return gmeAuth.connect()
        .then(function () {
            return testFixture.Q.allDone([
                gmeAuth.addUser(guestAccount, guestAccount + '@example.com', guestAccount, true, { overwrite: true }),
                gmeAuth.addUser('admin', 'admin@example.com', 'admin', true, { overwrite: true, siteAdmin: true })
            ]);
        })
        .then(function () {
            return authorizeProjects(gmeAuth, gmeConfigParameter, projectNameOrNames);
        })
        .then(function () {
            return gmeAuth;
        })
        .nodeify(callback);
}

var originalClearDBAndGetGMEAuth = testFixture.clearDBAndGetGMEAuth;
testFixture.clearDBAndGetGMEAuth = function (gmeConfigParameter, projectNameOrNames, callback) {
    if (usesMemoryGmeAuth(gmeConfigParameter)) {
        return getMemoryGMEAuth(gmeConfigParameter, projectNameOrNames, callback);
    }
    return originalClearDBAndGetGMEAuth(gmeConfigParameter, projectNameOrNames, callback);
};

var originalGetGMEAuth = testFixture.getGMEAuth;
testFixture.getGMEAuth = function (gmeConfigParameter, callback) {
    if (usesMemoryGmeAuth(gmeConfigParameter)) {
        var GmeAuthClass = loadGmeAuthClass(gmeConfigParameter),
            gmeAuth = new GmeAuthClass(null, gmeConfigParameter);
        return gmeAuth.connect()
            .then(function () {
                return gmeAuth;
            })
            .nodeify(callback);
    }
    return originalGetGMEAuth(gmeConfigParameter, callback);
};

module.exports = testFixture;
