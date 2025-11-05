const mongoose = require('mongoose');
const User = require('../models/user');   // LOWERCASE model name
const Task = require('../models/Task');   // File name is Task.js
const { parseJSON, arrayifyIds, ok, created, bad, notfound, oops } = require('./_utils');

module.exports = function (router) {

  function applyQuery(model, where, sort, select, skip, limit) {
    let q = model.find(where || {});
    if (sort)   q = q.sort(sort);
    if (select) q = q.select(select);
    if (skip)   q = q.skip(skip);
    if (typeof limit === 'number') q = q.limit(limit);
    return q;
  }

  // GET /api/users (where, sort, select, skip, limit, count)
  router.get('/', async (req, res) => {
    try {
      const where  = parseJSON(req.query.where);
      const sort   = parseJSON(req.query.sort);
      const select = parseJSON(req.query.select);
      const skip   = req.query.skip ? parseInt(req.query.skip, 10) : undefined;
      const limit  = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
      const count  = (req.query.count || '').toString().toLowerCase() === 'true';

      if ((where && where.__bad) || (sort && sort.__bad) || (select && select.__bad)) {
        return bad(res, 'Bad request');
      }

      if (count) {
        const c = await User.countDocuments(where || {});
        return ok(res, c);
      }
      const docs = await applyQuery(User, where, sort, select, skip, limit);
      return ok(res, docs);
    } catch (e) {
      return oops(res);
    }
  });

  // GET /api/users/:id (supports select)
  router.get('/:id', async (req, res) => {
    try {
      const select = parseJSON(req.query.select);
      if (select && select.__bad) return bad(res, 'Bad request');
      const doc = await User.findById(req.params.id).select(select || undefined);
      if (!doc) return notfound(res, 'Not found');
      return ok(res, doc);
    } catch (e) {
      return oops(res);
    }
  });

  // POST /api/users
  router.post('/', async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || !email) return bad(res, 'name and email are required');

      const user = new User({
        name: name.trim(),
        email: email.trim(),
        pendingTasks: []
      });
      await user.save();
      return created(res, user);
    } catch (e) {
      if (e && e.code === 11000) return bad(res, 'email must be unique');
      return oops(res);
    }
  });

  // PUT /api/users/:id  (replace entire user) + two-way refs
  router.put('/:id', async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || !email) return bad(res, 'name and email are required');

      const user = await User.findById(req.params.id);
      if (!user) return notfound(res, 'Not found');

      const newPending = arrayifyIds(req.body.pendingTasks);

      // Tasks currently assigned to this user
      const currentlyAssigned = await Task.find({ assignedUser: user._id.toString() }).select({ _id: 1 });
      const currentSet = new Set(currentlyAssigned.map(t => t._id.toString()));
      const newSet     = new Set(newPending);

      // Unassign tasks no longer pending
      const toUnassign = [...currentSet].filter(id => !newSet.has(id));
      if (toUnassign.length) {
        await Task.updateMany(
          { _id: { $in: toUnassign } },
          { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
        );
      }

      // Assign tasks newly pending
      const toAssign = [...newSet].filter(id => !currentSet.has(id));
      if (toAssign.length) {
        await Task.updateMany(
          { _id: { $in: toAssign } },
          { $set: { assignedUser: user._id.toString(), assignedUserName: name.trim() } }
        );
      }

      user.name = name.trim();
      user.email = email.trim();
      user.pendingTasks = newPending;
      await user.save();

      return ok(res, user);
    } catch (e) {
      if (e && e.code === 11000) return bad(res, 'email must be unique');
      return oops(res);
    }
  });

  // DELETE /api/users/:id  (unassign their tasks, then delete)
  router.delete('/:id', async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return notfound(res, 'Not found');

      await Task.updateMany(
        { assignedUser: user._id.toString() },
        { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
      );

      await user.deleteOne();
      return ok(res, null);
    } catch (e) {
      return oops(res);
    }
  });

  return router;
};
