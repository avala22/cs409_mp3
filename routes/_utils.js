// C:\dev\cs409_mp3\_utils.js
exports.parseJSON = function (s) {
    if (s === undefined) return null;
    try { return JSON.parse(s); } catch (e) { return { __bad: true }; }
  };
  
  exports.boolFromBody = function (v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.toLowerCase() === 'true';
    return !!v;
  };
  
  exports.arrayifyIds = function (v) {
    if (v === undefined || v === null) return [];
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch (_) {}
      return [String(v)];
    }
    return [String(v)];
  };
  
  exports.ok = (res, data) => res.status(200).json({ message: 'OK', data });
  exports.created = (res, data) => res.status(201).json({ message: 'OK', data });
  exports.bad = (res, msg = 'Bad request') => res.status(400).json({ message: msg, data: null });
  exports.notfound = (res, msg = 'Not found') => res.status(404).json({ message: msg, data: null });
  exports.oops = (res) => res.status(500).json({ message: 'Server error', data: null });
  