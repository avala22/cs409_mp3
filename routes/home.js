module.exports = function (router) {
    router.route('/')
      .get(function (_, res) {
        res.status(200).json({ message: 'OK', data: 'API root' });
      });
    return router;
  };
  