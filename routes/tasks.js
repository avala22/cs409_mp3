const mongoose = require('mongoose');
const Task = require('../models/Task');   // File name Task.js
const User = require('../models/user');   // LOWERCASE model name
const { parseJSON, boolFromBody, ok, created, bad, notfound, oops } = require('./_utils');

module.exports = function (router) {

  function applyQuery(model, where, sort, select, skip, limit) {
    let q = model.find(where || {});
    if (sort)   q = q.sort(sort);
    if (select) q = q.select(select);
    if (skip)   q = q.skip(skip);
    if (typeof limit === 'number') q = q.limit(limit);
    return q;
  }

  // GET /api/tasks (default limit 100)
  router.get('/', async (req, res) => {
    try {
      const where  = parseJSON(req.query.where);
      const sort   = parseJSON(req.query.sort);
      const select = parseJSON(req.query.select);
      const skip   = req.query.skip ? parseInt(req.query.skip, 10) : undefined;
      const limit  = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const count  = (req.query.count || '').toString().toLowerCase() === 'true';

      if ((where && where.__bad) || (sort && sort.__bad) || (select && select.__bad)) {
        return bad(res, 'Bad request');
      }

      if (count) {
        const c = await Task.countDocuments(where || {});
        return ok(res, c);
      }

      const docs = await applyQuery(Task, where, sort, select, skip, limit);
      return ok(res, docs);
    } catch (e) {
      return oops(res);
    }
  });

  // GET /api/tasks/:id (supports select)
  router.get('/:id', async (req, res) => {
    try {
      const select = parseJSON(req.query.select);
      if (select && select.__bad) return bad(res, 'Bad request');
      const doc = await Task.findById(req.params.id).select(select || undefined);
      if (!doc) return notfound(res, 'Not found');
      return ok(res, doc);
    } catch (e) {
      return oops(res);
    }
  });

  // POST /api/tasks
  router.post('/', async (req, res) => {
    try {
      const name = (req.body.name || '').trim();
      const deadline = req.body.deadline ? new Date(req.body.deadline) : null;
      if (!name || !deadline) return bad(res, 'name and deadline are required');

      const assignedUser = (req.body.assignedUser || '').trim();
      let assignedUserName = (req.body.assignedUserName || 'unassigned').trim();
      const completed = boolFromBody(req.body.completed);

      if (assignedUser) {
        const u = await User.findById(assignedUser);
        if (!u) return bad(res, 'assignedUser does not exist');
        assignedUserName = u.name;
      } else {
        assignedUserName = 'unassigned';
      }

      const task = new Task({
        name,
        description: (req.body.description || '').trim(),
        deadline,
        completed,
        assignedUser,
        assignedUserName
      });
      await task.save();

      // Two-way: if assigned and NOT completed => add to user's pendingTasks
      if (assignedUser && !completed) {
        await User.updateOne(
          { _id: assignedUser },
          { $addToSet: { pendingTasks: task._id.toString() } }
        );
      }

      return created(res, task);
    } catch (e) {
      return oops(res);
    }
  });

  // PUT /api/tasks/:id  (replace entire task) + two-way refs
  router.put('/:id', async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) return notfound(res, 'Not found');

      const newName = (req.body.name || '').trim();
      const newDeadline = req.body.deadline ? new Date(req.body.deadline) : null;
      if (!newName || !newDeadline) return bad(res, 'name and deadline are required');

      const newAssignedUser = (req.body.assignedUser || '').trim();
      let newAssignedUserName = (req.body.assignedUserName || 'unassigned').trim();
      const newCompleted = boolFromBody(req.body.completed);

      // If newAssignedUser provided, it must exist
      if (newAssignedUser) {
        const u = await User.findById(newAssignedUser);
        if (!u) return bad(res, 'assignedUser does not exist');
        newAssignedUserName = u.name;
      } else {
        newAssignedUserName = 'unassigned';
      }

      const oldAssignedUser = task.assignedUser;
      const oldCompleted = !!task.completed;
      const taskIdStr = task._id.toString();

      // If the old user had it pending, and either user changed or it is now completed -> pull from old
      if (oldAssignedUser && (!newAssignedUser || newAssignedUser !== oldAssignedUser || newCompleted)) {
        await User.updateOne(
          { _id: oldAssignedUser },
          { $pull: { pendingTasks: taskIdStr } }
        );
      }

      // If new assignment is active (has user and not completed) -> ensure in that user's pendingTasks
      if (newAssignedUser && !newCompleted) {
        await User.updateOne(
          { _id: newAssignedUser },
          { $addToSet: { pendingTasks: taskIdStr } }
        );
      }

      // Replace the task document
      task.name = newName;
      task.description = (req.body.description || '').trim();
      task.deadline = newDeadline;
      task.completed = newCompleted;
      task.assignedUser = newAssignedUser;
      task.assignedUserName = newAssignedUserName;
      await task.save();

      return ok(res, task);
    } catch (e) {
      return oops(res);
    }
  });

  // DELETE /api/tasks/:id  (also remove from user's pendingTasks)
  router.delete('/:id', async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) return notfound(res, 'Not found');

      if (task.assignedUser) {
        await User.updateOne(
          { _id: task.assignedUser },
          { $pull: { pendingTasks: task._id.toString() } }
        );
      }

      await task.deleteOne();
      return ok(res, null);
    } catch (e) {
      return oops(res);
    }
  });

  return router;
};
