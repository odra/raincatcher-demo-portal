/**
* CONFIDENTIAL
* Copyright 2016 Red Hat, Inc. and/or its affiliates.
* This is unpublished proprietary source code of Red Hat.
**/
'use strict';

var _ = require('lodash');
require('angular-messages');

angular.module('app.workorder', [
  'ui.router'
, 'wfm.core.mediator'
, 'ngMessages'
])

.config(function($stateProvider) {
  $stateProvider
    .state('app.workorder', {
      url: '/workorders/list',
      resolve: {
        workorders: function(workorderManager) {
          return workorderManager.list();
        },
        workflows: function(workflowManager) {
          return workflowManager.list();
        },
        resultManager: function(resultSync) {
          return resultSync.managerPromise;
        },
      },
      views: {
        column2: {
          templateUrl: 'app/workorder/workorder-list.tpl.html',
          controller: 'WorkorderListController as workorderListController',
        },
        'content': {
          templateUrl: 'app/workorder/empty.tpl.html',
        }
      }
    })
    .state('app.workorder.new', {
      url: '/new',
      views: {
        'content@app': {
          templateUrl: 'app/workorder/workorder-new.tpl.html',
          controller: 'WorkorderNewController as ctrl',
          resolve: {
            workorder: function(workorderManager) {
              return workorderManager.new();
            },
            workers: function(userClient) {
              return userClient.list();
            }
          }
        }
      }
    })
    .state('app.workorder.detail', {
      url: '/workorder/:workorderId',
      views: {
        'content@app': {
          templateUrl: 'app/workorder/workorder-detail.tpl.html',
          controller: 'WorkorderDetailController as ctrl',
          resolve: {
            workorder: function($stateParams, appformClient, workorderManager) {
              return workorderManager.read($stateParams.workorderId)
            },
            workers: function(userClient) {
              return userClient.list();
            },
            result: function($stateParams, resultManager) {
              return resultManager.getByWorkorderId($stateParams.workorderId);
            }
          }
        }
      }
    })
    .state('app.workorder.edit', {
      url: '/workorder/:workorderId/edit',
      views: {
        'content@app': {
          templateUrl: 'app/workorder/workorder-edit.tpl.html',
          controller: 'WorkorderFormController as ctrl',
          resolve: {
            workorder: function($stateParams, workorderManager) {
              return workorderManager.read($stateParams.workorderId);
            },
            workers: function(userClient) {
              return userClient.list();
            }
          }
        }
      }
    });
})

.run(function($state, mediator) {
  mediator.subscribe('workorder:selected', function(workorder) {
    $state.go(
      'app.workorder.detail',
      { workorderId: workorder.id || workorder._localuid },
      { reload: true }
    );
  });
  mediator.subscribe('workflow:selected', function(workflow) {
    $state.go('app.workflow.detail', {
      workflowId: workflow.id
    });
  });
})

.controller('WorkorderListController', function ($scope, workorders) {
  var self = this;
  self.workorders = workorders;
  $scope.$parent.selected = {id: null};
})

.controller('WorkorderDetailController', function ($scope, $state, $mdDialog, mediator, workorderManager, workflows, workorder, result, workers) {
  var self = this;
  $scope.selected.id = workorder.id;

  self.workorder = workorder;
  self.workflow = workflows[workorder.workflowId];
  self.result = result;
  var assignee = workers.filter(function(worker) {
    return worker.id = workorder.assignee
  })
  if (assignee.length) {
    self.assignee = assignee[0];
  }
  self.steps = self.workflow.steps;

  self.beginWorkflow = function(event, workorder) {
    mediator.publish('workflow:begin', workorder.id);
    event.preventDefault();
  };

  self.delete = function(event, workorder) {
    event.preventDefault();
    var confirm = $mdDialog.confirm()
          .title('Would you like to delete workorder #'+workorder.id+'?')
          .textContent(workorder.title)
          .ariaLabel('Delete Workorder')
          .targetEvent(event)
          .ok('Proceed')
          .cancel('Cancel');
    $mdDialog.show(confirm).then(function() {
      return workorderManager.delete(workorder)
      .then(function() {
        $state.go('app.workorder', null, {reload: true});
      }, function(err) {
        throw err;
      })
    });
  }
})

.controller('WorkorderNewController', function(workorder, workflows, mediator, workorderManager, workers) {
  var self = this;

  self.workorder = workorder;
  self.workflows = workflows;
  self.workers = workers;

  mediator.subscribe('workorder:created', function(workorder) {
    workorderManager.create(workorder).then(function(_workorder) {
      mediator.publish('workorder:selected', _workorder);
    });
  });
})

.controller('WorkorderFormController', function ($state, mediator, workorderManager, workorder, workflows, workers) {
  var self = this;

  self.workorder = workorder;
  self.workflows = workflows;
  self.workers = workers;

  mediator.subscribe('workorder:edited', function(workorder) {
    return workorderManager.update(workorder).then(function(_workorder) {
      mediator.publish('workorder:selected', _workorder);
    })
  });
})

;

module.exports = 'app.workorder';
