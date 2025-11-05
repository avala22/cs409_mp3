module.exports = function (app, router) {
    app.get('/api', (req, res) => res.json({ message: 'OK', data: 'API root' }));
    app.use('/api/users', require('./users'));
    app.use('/api/tasks', require('./tasks'));
  };
  