import require$$0$2 from 'fs';
import require$$0 from 'constants';
import require$$0$1 from 'stream';
import require$$4 from 'util';
import require$$5 from 'assert';
import require$$1, { resolve as resolve$1 } from 'path';
import crypto from 'crypto';

// Transaction: 用于管理 Promise 链的一个类
// new Transaction([
//   [name,function],
//   [name,function],
//   [name,function],
// ])
// 在 function 中接收的参数为整个 _PromiseMap, 通过对应的 name 来调用那个 function 的返回结果

class Transaction {
    _functionMap = new Map(); // 储存所有存入的函数

    constructor(initMapArray = new Map()) {
        this._functionMap = initMapArray instanceof Map ? initMapArray : new Map(initMapArray);
    }
    async run(...args) {
        const _PromiseMap = new Map(); // 存储所有的结果
        let LastResult; //存储上一个结果
        return [...this._functionMap.entries()].reduce((promise, [name, cur]) => {
            return promise.then(async (_PromiseMap) => {
                try {
                    //! 兼容非 async function 的写法, promise 的 then 方式对同步函数没法转异步
                    let result = await cur.apply(this, [_PromiseMap, LastResult, ...args]);
                    _PromiseMap.set(name, result);
                    LastResult = result;
                    return _PromiseMap;
                } catch (error) {
                    throw new Error(`Function: ${name} ${error}`);
                }
            });
        }, Promise.resolve(_PromiseMap));
    } // 开始执行 Promise 链的启动函数

    // 注意，array => promise line , 设置的 func 都应该是纯函数
    set(name, func) {
        this._functionMap.set(name, func);
    }
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function commonjsRequire (path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var fs$i = {};

var universalify$1 = {};

universalify$1.fromCallback = function (fn) {
  return Object.defineProperty(function (...args) {
    if (typeof args[args.length - 1] === 'function') fn.apply(this, args);
    else {
      return new Promise((resolve, reject) => {
        fn.call(
          this,
          ...args,
          (err, res) => (err != null) ? reject(err) : resolve(res)
        );
      })
    }
  }, 'name', { value: fn.name })
};

universalify$1.fromPromise = function (fn) {
  return Object.defineProperty(function (...args) {
    const cb = args[args.length - 1];
    if (typeof cb !== 'function') return fn.apply(this, args)
    else fn.apply(this, args.slice(0, -1)).then(r => cb(null, r), cb);
  }, 'name', { value: fn.name })
};

var constants = require$$0;

var origCwd = process.cwd;
var cwd = null;

var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;

process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process);
  return cwd
};
try {
  process.cwd();
} catch (er) {}

// This check is needed until node.js 12 is required
if (typeof process.chdir === 'function') {
  var chdir = process.chdir;
  process.chdir = function (d) {
    cwd = null;
    chdir.call(process, d);
  };
  if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
}

var polyfills$1 = patch$1;

function patch$1 (fs) {
  // (re-)implement some things that are known busted or missing.

  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs);
  }

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    patchLutimes(fs);
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs.chown = chownFix(fs.chown);
  fs.fchown = chownFix(fs.fchown);
  fs.lchown = chownFix(fs.lchown);

  fs.chmod = chmodFix(fs.chmod);
  fs.fchmod = chmodFix(fs.fchmod);
  fs.lchmod = chmodFix(fs.lchmod);

  fs.chownSync = chownFixSync(fs.chownSync);
  fs.fchownSync = chownFixSync(fs.fchownSync);
  fs.lchownSync = chownFixSync(fs.lchownSync);

  fs.chmodSync = chmodFixSync(fs.chmodSync);
  fs.fchmodSync = chmodFixSync(fs.fchmodSync);
  fs.lchmodSync = chmodFixSync(fs.lchmodSync);

  fs.stat = statFix(fs.stat);
  fs.fstat = statFix(fs.fstat);
  fs.lstat = statFix(fs.lstat);

  fs.statSync = statFixSync(fs.statSync);
  fs.fstatSync = statFixSync(fs.fstatSync);
  fs.lstatSync = statFixSync(fs.lstatSync);

  // if lchmod/lchown do not exist, then make them no-ops
  if (!fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      if (cb) process.nextTick(cb);
    };
    fs.lchmodSync = function () {};
  }
  if (!fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      if (cb) process.nextTick(cb);
    };
    fs.lchownSync = function () {};
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.

  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.
  if (platform === "win32") {
    fs.rename = (function (fs$rename) { return function (from, to, cb) {
      var start = Date.now();
      var backoff = 0;
      fs$rename(from, to, function CB (er) {
        if (er
            && (er.code === "EACCES" || er.code === "EPERM")
            && Date.now() - start < 60000) {
          setTimeout(function() {
            fs.stat(to, function (stater, st) {
              if (stater && stater.code === "ENOENT")
                fs$rename(from, to, CB);
              else
                cb(er);
            });
          }, backoff);
          if (backoff < 100)
            backoff += 10;
          return;
        }
        if (cb) cb(er);
      });
    }})(fs.rename);
  }

  // if read() returns EAGAIN, then just try it again.
  fs.read = (function (fs$read) {
    function read (fd, buffer, offset, length, position, callback_) {
      var callback;
      if (callback_ && typeof callback_ === 'function') {
        var eagCounter = 0;
        callback = function (er, _, __) {
          if (er && er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter ++;
            return fs$read.call(fs, fd, buffer, offset, length, position, callback)
          }
          callback_.apply(this, arguments);
        };
      }
      return fs$read.call(fs, fd, buffer, offset, length, position, callback)
    }

    // This ensures `util.promisify` works as it does for native `fs.read`.
    if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
    return read
  })(fs.read);

  fs.readSync = (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
    var eagCounter = 0;
    while (true) {
      try {
        return fs$readSync.call(fs, fd, buffer, offset, length, position)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++;
          continue
        }
        throw er
      }
    }
  }})(fs.readSync);

  function patchLchmod (fs) {
    fs.lchmod = function (path, mode, callback) {
      fs.open( path
             , constants.O_WRONLY | constants.O_SYMLINK
             , mode
             , function (err, fd) {
        if (err) {
          if (callback) callback(err);
          return
        }
        // prefer to return the chmod error, if one occurs,
        // but still try to close, and report closing errors if they occur.
        fs.fchmod(fd, mode, function (err) {
          fs.close(fd, function(err2) {
            if (callback) callback(err || err2);
          });
        });
      });
    };

    fs.lchmodSync = function (path, mode) {
      var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);

      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      var threw = true;
      var ret;
      try {
        ret = fs.fchmodSync(fd, mode);
        threw = false;
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd);
          } catch (er) {}
        } else {
          fs.closeSync(fd);
        }
      }
      return ret
    };
  }

  function patchLutimes (fs) {
    if (constants.hasOwnProperty("O_SYMLINK")) {
      fs.lutimes = function (path, at, mt, cb) {
        fs.open(path, constants.O_SYMLINK, function (er, fd) {
          if (er) {
            if (cb) cb(er);
            return
          }
          fs.futimes(fd, at, mt, function (er) {
            fs.close(fd, function (er2) {
              if (cb) cb(er || er2);
            });
          });
        });
      };

      fs.lutimesSync = function (path, at, mt) {
        var fd = fs.openSync(path, constants.O_SYMLINK);
        var ret;
        var threw = true;
        try {
          ret = fs.futimesSync(fd, at, mt);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs.closeSync(fd);
            } catch (er) {}
          } else {
            fs.closeSync(fd);
          }
        }
        return ret
      };

    } else {
      fs.lutimes = function (_a, _b, _c, cb) { if (cb) process.nextTick(cb); };
      fs.lutimesSync = function () {};
    }
  }

  function chmodFix (orig) {
    if (!orig) return orig
    return function (target, mode, cb) {
      return orig.call(fs, target, mode, function (er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      })
    }
  }

  function chmodFixSync (orig) {
    if (!orig) return orig
    return function (target, mode) {
      try {
        return orig.call(fs, target, mode)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }


  function chownFix (orig) {
    if (!orig) return orig
    return function (target, uid, gid, cb) {
      return orig.call(fs, target, uid, gid, function (er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      })
    }
  }

  function chownFixSync (orig) {
    if (!orig) return orig
    return function (target, uid, gid) {
      try {
        return orig.call(fs, target, uid, gid)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }

  function statFix (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options, cb) {
      if (typeof options === 'function') {
        cb = options;
        options = null;
      }
      function callback (er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 0x100000000;
          if (stats.gid < 0) stats.gid += 0x100000000;
        }
        if (cb) cb.apply(this, arguments);
      }
      return options ? orig.call(fs, target, options, callback)
        : orig.call(fs, target, callback)
    }
  }

  function statFixSync (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options) {
      var stats = options ? orig.call(fs, target, options)
        : orig.call(fs, target);
      if (stats.uid < 0) stats.uid += 0x100000000;
      if (stats.gid < 0) stats.gid += 0x100000000;
      return stats;
    }
  }

  // ENOSYS means that the fs doesn't support the op. Just ignore
  // that, because it doesn't matter.
  //
  // if there's no getuid, or if getuid() is something other
  // than 0, and the error is EINVAL or EPERM, then just ignore
  // it.
  //
  // This specific case is a silent failure in cp, install, tar,
  // and most other unix tools that manage permissions.
  //
  // When running as root, or if other types of errors are
  // encountered, then it's strict.
  function chownErOk (er) {
    if (!er)
      return true

    if (er.code === "ENOSYS")
      return true

    var nonroot = !process.getuid || process.getuid() !== 0;
    if (nonroot) {
      if (er.code === "EINVAL" || er.code === "EPERM")
        return true
    }

    return false
  }
}

var Stream = require$$0$1.Stream;

var legacyStreams = legacy$1;

function legacy$1 (fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  }

  function ReadStream (path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);

    Stream.call(this);

    var self = this;

    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;

    this.flags = 'r';
    this.mode = 438; /*=0666*/
    this.bufferSize = 64 * 1024;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function() {
        self._read();
      });
      return;
    }

    fs.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);
      self._read();
    });
  }

  function WriteStream (path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);

    Stream.call(this);

    this.path = path;
    this.fd = null;
    this.writable = true;

    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438; /*=0666*/
    this.bytesWritten = 0;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
      this.flush();
    }
  }
}

var clone_1 = clone$2;

var getPrototypeOf = Object.getPrototypeOf || function (obj) {
  return obj.__proto__
};

function clone$2 (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: getPrototypeOf(obj) };
  else
    var copy = Object.create(null);

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
  });

  return copy
}

var fs$h = require$$0$2;
var polyfills = polyfills$1;
var legacy = legacyStreams;
var clone$1 = clone_1;

var util$1 = require$$4;

/* istanbul ignore next - node 0.x polyfill */
var gracefulQueue;
var previousSymbol;

/* istanbul ignore else - node 0.x polyfill */
if (typeof Symbol === 'function' && typeof Symbol.for === 'function') {
  gracefulQueue = Symbol.for('graceful-fs.queue');
  // This is used in testing by future versions
  previousSymbol = Symbol.for('graceful-fs.previous');
} else {
  gracefulQueue = '___graceful-fs.queue';
  previousSymbol = '___graceful-fs.previous';
}

function noop () {}

function publishQueue(context, queue) {
  Object.defineProperty(context, gracefulQueue, {
    get: function() {
      return queue
    }
  });
}

var debug = noop;
if (util$1.debuglog)
  debug = util$1.debuglog('gfs4');
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = util$1.format.apply(util$1, arguments);
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ');
    console.error(m);
  };

// Once time initialization
if (!fs$h[gracefulQueue]) {
  // This queue can be shared by multiple loaded instances
  var queue = commonjsGlobal[gracefulQueue] || [];
  publishQueue(fs$h, queue);

  // Patch fs.close/closeSync to shared queue version, because we need
  // to retry() whenever a close happens *anywhere* in the program.
  // This is essential when multiple graceful-fs instances are
  // in play at the same time.
  fs$h.close = (function (fs$close) {
    function close (fd, cb) {
      return fs$close.call(fs$h, fd, function (err) {
        // This function uses the graceful-fs shared queue
        if (!err) {
          resetQueue();
        }

        if (typeof cb === 'function')
          cb.apply(this, arguments);
      })
    }

    Object.defineProperty(close, previousSymbol, {
      value: fs$close
    });
    return close
  })(fs$h.close);

  fs$h.closeSync = (function (fs$closeSync) {
    function closeSync (fd) {
      // This function uses the graceful-fs shared queue
      fs$closeSync.apply(fs$h, arguments);
      resetQueue();
    }

    Object.defineProperty(closeSync, previousSymbol, {
      value: fs$closeSync
    });
    return closeSync
  })(fs$h.closeSync);

  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
    process.on('exit', function() {
      debug(fs$h[gracefulQueue]);
      require$$5.equal(fs$h[gracefulQueue].length, 0);
    });
  }
}

if (!commonjsGlobal[gracefulQueue]) {
  publishQueue(commonjsGlobal, fs$h[gracefulQueue]);
}

var gracefulFs = patch(clone$1(fs$h));
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs$h.__patched) {
    gracefulFs = patch(fs$h);
    fs$h.__patched = true;
}

function patch (fs) {
  // Everything that references the open() function needs to be in here
  polyfills(fs);
  fs.gracefulify = patch;

  fs.createReadStream = createReadStream;
  fs.createWriteStream = createWriteStream;
  var fs$readFile = fs.readFile;
  fs.readFile = readFile;
  function readFile (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$readFile(path, options, cb)

    function go$readFile (path, options, cb, startTime) {
      return fs$readFile(path, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readFile, [path, options, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  var fs$writeFile = fs.writeFile;
  fs.writeFile = writeFile;
  function writeFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$writeFile(path, data, options, cb)

    function go$writeFile (path, data, options, cb, startTime) {
      return fs$writeFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$writeFile, [path, data, options, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  var fs$appendFile = fs.appendFile;
  if (fs$appendFile)
    fs.appendFile = appendFile;
  function appendFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$appendFile(path, data, options, cb)

    function go$appendFile (path, data, options, cb, startTime) {
      return fs$appendFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$appendFile, [path, data, options, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  var fs$copyFile = fs.copyFile;
  if (fs$copyFile)
    fs.copyFile = copyFile;
  function copyFile (src, dest, flags, cb) {
    if (typeof flags === 'function') {
      cb = flags;
      flags = 0;
    }
    return go$copyFile(src, dest, flags, cb)

    function go$copyFile (src, dest, flags, cb, startTime) {
      return fs$copyFile(src, dest, flags, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$copyFile, [src, dest, flags, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  var fs$readdir = fs.readdir;
  fs.readdir = readdir;
  function readdir (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$readdir(path, options, cb)

    function go$readdir (path, options, cb, startTime) {
      return fs$readdir(path, options, function (err, files) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readdir, [path, options, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (files && files.sort)
            files.sort();

          if (typeof cb === 'function')
            cb.call(this, err, files);
        }
      })
    }
  }

  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacy(fs);
    ReadStream = legStreams.ReadStream;
    WriteStream = legStreams.WriteStream;
  }

  var fs$ReadStream = fs.ReadStream;
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype);
    ReadStream.prototype.open = ReadStream$open;
  }

  var fs$WriteStream = fs.WriteStream;
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype);
    WriteStream.prototype.open = WriteStream$open;
  }

  Object.defineProperty(fs, 'ReadStream', {
    get: function () {
      return ReadStream
    },
    set: function (val) {
      ReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(fs, 'WriteStream', {
    get: function () {
      return WriteStream
    },
    set: function (val) {
      WriteStream = val;
    },
    enumerable: true,
    configurable: true
  });

  // legacy names
  var FileReadStream = ReadStream;
  Object.defineProperty(fs, 'FileReadStream', {
    get: function () {
      return FileReadStream
    },
    set: function (val) {
      FileReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  var FileWriteStream = WriteStream;
  Object.defineProperty(fs, 'FileWriteStream', {
    get: function () {
      return FileWriteStream
    },
    set: function (val) {
      FileWriteStream = val;
    },
    enumerable: true,
    configurable: true
  });

  function ReadStream (path, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
  }

  function ReadStream$open () {
    var that = this;
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy();

        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
        that.read();
      }
    });
  }

  function WriteStream (path, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
  }

  function WriteStream$open () {
    var that = this;
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy();
        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
      }
    });
  }

  function createReadStream (path, options) {
    return new fs.ReadStream(path, options)
  }

  function createWriteStream (path, options) {
    return new fs.WriteStream(path, options)
  }

  var fs$open = fs.open;
  fs.open = open;
  function open (path, flags, mode, cb) {
    if (typeof mode === 'function')
      cb = mode, mode = null;

    return go$open(path, flags, mode, cb)

    function go$open (path, flags, mode, cb, startTime) {
      return fs$open(path, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$open, [path, flags, mode, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  return fs
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1]);
  fs$h[gracefulQueue].push(elem);
  retry();
}

// keep track of the timeout between retry() calls
var retryTimer;

// reset the startTime and lastTime to now
// this resets the start of the 60 second overall timeout as well as the
// delay between attempts so that we'll retry these jobs sooner
function resetQueue () {
  var now = Date.now();
  for (var i = 0; i < fs$h[gracefulQueue].length; ++i) {
    // entries that are only a length of 2 are from an older version, don't
    // bother modifying those since they'll be retried anyway.
    if (fs$h[gracefulQueue][i].length > 2) {
      fs$h[gracefulQueue][i][3] = now; // startTime
      fs$h[gracefulQueue][i][4] = now; // lastTime
    }
  }
  // call retry to make sure we're actively processing the queue
  retry();
}

function retry () {
  // clear the timer and remove it to help prevent unintended concurrency
  clearTimeout(retryTimer);
  retryTimer = undefined;

  if (fs$h[gracefulQueue].length === 0)
    return

  var elem = fs$h[gracefulQueue].shift();
  var fn = elem[0];
  var args = elem[1];
  // these items may be unset if they were added by an older graceful-fs
  var err = elem[2];
  var startTime = elem[3];
  var lastTime = elem[4];

  // if we don't have a startTime we have no way of knowing if we've waited
  // long enough, so go ahead and retry this item now
  if (startTime === undefined) {
    debug('RETRY', fn.name, args);
    fn.apply(null, args);
  } else if (Date.now() - startTime >= 60000) {
    // it's been more than 60 seconds total, bail now
    debug('TIMEOUT', fn.name, args);
    var cb = args.pop();
    if (typeof cb === 'function')
      cb.call(null, err);
  } else {
    // the amount of time between the last attempt and right now
    var sinceAttempt = Date.now() - lastTime;
    // the amount of time between when we first tried, and when we last tried
    // rounded up to at least 1
    var sinceStart = Math.max(lastTime - startTime, 1);
    // backoff. wait longer than the total time we've been retrying, but only
    // up to a maximum of 100ms
    var desiredDelay = Math.min(sinceStart * 1.2, 100);
    // it's been long enough since the last retry, do it again
    if (sinceAttempt >= desiredDelay) {
      debug('RETRY', fn.name, args);
      fn.apply(null, args.concat([startTime]));
    } else {
      // if we can't do this job yet, push it to the end of the queue
      // and let the next iteration check again
      fs$h[gracefulQueue].push(elem);
    }
  }

  // schedule our next run if one isn't already scheduled
  if (retryTimer === undefined) {
    retryTimer = setTimeout(retry, 0);
  }
}

(function (exports) {
// This is adapted from https://github.com/normalize/mz
// Copyright (c) 2014-2016 Jonathan Ong me@jongleberry.com and Contributors
const u = universalify$1.fromCallback;
const fs = gracefulFs;

const api = [
  'access',
  'appendFile',
  'chmod',
  'chown',
  'close',
  'copyFile',
  'fchmod',
  'fchown',
  'fdatasync',
  'fstat',
  'fsync',
  'ftruncate',
  'futimes',
  'lchmod',
  'lchown',
  'link',
  'lstat',
  'mkdir',
  'mkdtemp',
  'open',
  'opendir',
  'readdir',
  'readFile',
  'readlink',
  'realpath',
  'rename',
  'rm',
  'rmdir',
  'stat',
  'symlink',
  'truncate',
  'unlink',
  'utimes',
  'writeFile'
].filter(key => {
  // Some commands are not available on some systems. Ex:
  // fs.opendir was added in Node.js v12.12.0
  // fs.rm was added in Node.js v14.14.0
  // fs.lchown is not available on at least some Linux
  return typeof fs[key] === 'function'
});

// Export cloned fs:
Object.assign(exports, fs);

// Universalify async methods:
api.forEach(method => {
  exports[method] = u(fs[method]);
});
exports.realpath.native = u(fs.realpath.native);

// We differ from mz/fs in that we still ship the old, broken, fs.exists()
// since we are a drop-in replacement for the native module
exports.exists = function (filename, callback) {
  if (typeof callback === 'function') {
    return fs.exists(filename, callback)
  }
  return new Promise(resolve => {
    return fs.exists(filename, resolve)
  })
};

// fs.read(), fs.write(), & fs.writev() need special treatment due to multiple callback args

exports.read = function (fd, buffer, offset, length, position, callback) {
  if (typeof callback === 'function') {
    return fs.read(fd, buffer, offset, length, position, callback)
  }
  return new Promise((resolve, reject) => {
    fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
      if (err) return reject(err)
      resolve({ bytesRead, buffer });
    });
  })
};

// Function signature can be
// fs.write(fd, buffer[, offset[, length[, position]]], callback)
// OR
// fs.write(fd, string[, position[, encoding]], callback)
// We need to handle both cases, so we use ...args
exports.write = function (fd, buffer, ...args) {
  if (typeof args[args.length - 1] === 'function') {
    return fs.write(fd, buffer, ...args)
  }

  return new Promise((resolve, reject) => {
    fs.write(fd, buffer, ...args, (err, bytesWritten, buffer) => {
      if (err) return reject(err)
      resolve({ bytesWritten, buffer });
    });
  })
};

// fs.writev only available in Node v12.9.0+
if (typeof fs.writev === 'function') {
  // Function signature is
  // s.writev(fd, buffers[, position], callback)
  // We need to handle the optional arg, so we use ...args
  exports.writev = function (fd, buffers, ...args) {
    if (typeof args[args.length - 1] === 'function') {
      return fs.writev(fd, buffers, ...args)
    }

    return new Promise((resolve, reject) => {
      fs.writev(fd, buffers, ...args, (err, bytesWritten, buffers) => {
        if (err) return reject(err)
        resolve({ bytesWritten, buffers });
      });
    })
  };
}
}(fs$i));

var makeDir$1 = {};

var utils$1 = {};

const path$c = require$$1;

// https://github.com/nodejs/node/issues/8987
// https://github.com/libuv/libuv/pull/1088
utils$1.checkPath = function checkPath (pth) {
  if (process.platform === 'win32') {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path$c.parse(pth).root, ''));

    if (pathHasInvalidWinCharacters) {
      const error = new Error(`Path contains invalid characters: ${pth}`);
      error.code = 'EINVAL';
      throw error
    }
  }
};

const fs$g = fs$i;
const { checkPath } = utils$1;

const getMode = options => {
  const defaults = { mode: 0o777 };
  if (typeof options === 'number') return options
  return ({ ...defaults, ...options }).mode
};

makeDir$1.makeDir = async (dir, options) => {
  checkPath(dir);

  return fs$g.mkdir(dir, {
    mode: getMode(options),
    recursive: true
  })
};

makeDir$1.makeDirSync = (dir, options) => {
  checkPath(dir);

  return fs$g.mkdirSync(dir, {
    mode: getMode(options),
    recursive: true
  })
};

const u$a = universalify$1.fromPromise;
const { makeDir: _makeDir, makeDirSync } = makeDir$1;
const makeDir = u$a(_makeDir);

var mkdirs$2 = {
  mkdirs: makeDir,
  mkdirsSync: makeDirSync,
  // alias
  mkdirp: makeDir,
  mkdirpSync: makeDirSync,
  ensureDir: makeDir,
  ensureDirSync: makeDirSync
};

const fs$f = gracefulFs;

function utimesMillis$1 (path, atime, mtime, callback) {
  // if (!HAS_MILLIS_RES) return fs.utimes(path, atime, mtime, callback)
  fs$f.open(path, 'r+', (err, fd) => {
    if (err) return callback(err)
    fs$f.futimes(fd, atime, mtime, futimesErr => {
      fs$f.close(fd, closeErr => {
        if (callback) callback(futimesErr || closeErr);
      });
    });
  });
}

function utimesMillisSync$1 (path, atime, mtime) {
  const fd = fs$f.openSync(path, 'r+');
  fs$f.futimesSync(fd, atime, mtime);
  return fs$f.closeSync(fd)
}

var utimes = {
  utimesMillis: utimesMillis$1,
  utimesMillisSync: utimesMillisSync$1
};

const fs$e = fs$i;
const path$b = require$$1;
const util = require$$4;

function getStats$2 (src, dest, opts) {
  const statFunc = opts.dereference
    ? (file) => fs$e.stat(file, { bigint: true })
    : (file) => fs$e.lstat(file, { bigint: true });
  return Promise.all([
    statFunc(src),
    statFunc(dest).catch(err => {
      if (err.code === 'ENOENT') return null
      throw err
    })
  ]).then(([srcStat, destStat]) => ({ srcStat, destStat }))
}

function getStatsSync (src, dest, opts) {
  let destStat;
  const statFunc = opts.dereference
    ? (file) => fs$e.statSync(file, { bigint: true })
    : (file) => fs$e.lstatSync(file, { bigint: true });
  const srcStat = statFunc(src);
  try {
    destStat = statFunc(dest);
  } catch (err) {
    if (err.code === 'ENOENT') return { srcStat, destStat: null }
    throw err
  }
  return { srcStat, destStat }
}

function checkPaths (src, dest, funcName, opts, cb) {
  util.callbackify(getStats$2)(src, dest, opts, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, destStat } = stats;

    if (destStat) {
      if (areIdentical$2(srcStat, destStat)) {
        const srcBaseName = path$b.basename(src);
        const destBaseName = path$b.basename(dest);
        if (funcName === 'move' &&
          srcBaseName !== destBaseName &&
          srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
          return cb(null, { srcStat, destStat, isChangingCase: true })
        }
        return cb(new Error('Source and destination must not be the same.'))
      }
      if (srcStat.isDirectory() && !destStat.isDirectory()) {
        return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`))
      }
      if (!srcStat.isDirectory() && destStat.isDirectory()) {
        return cb(new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`))
      }
    }

    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
      return cb(new Error(errMsg(src, dest, funcName)))
    }
    return cb(null, { srcStat, destStat })
  });
}

function checkPathsSync (src, dest, funcName, opts) {
  const { srcStat, destStat } = getStatsSync(src, dest, opts);

  if (destStat) {
    if (areIdentical$2(srcStat, destStat)) {
      const srcBaseName = path$b.basename(src);
      const destBaseName = path$b.basename(dest);
      if (funcName === 'move' &&
        srcBaseName !== destBaseName &&
        srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true }
      }
      throw new Error('Source and destination must not be the same.')
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`)
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`)
    }
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return { srcStat, destStat }
}

// recursively check if dest parent is a subdirectory of src.
// It works for all file types including symlinks since it
// checks the src and dest inodes. It starts from the deepest
// parent and stops once it reaches the src parent or the root path.
function checkParentPaths (src, srcStat, dest, funcName, cb) {
  const srcParent = path$b.resolve(path$b.dirname(src));
  const destParent = path$b.resolve(path$b.dirname(dest));
  if (destParent === srcParent || destParent === path$b.parse(destParent).root) return cb()
  fs$e.stat(destParent, { bigint: true }, (err, destStat) => {
    if (err) {
      if (err.code === 'ENOENT') return cb()
      return cb(err)
    }
    if (areIdentical$2(srcStat, destStat)) {
      return cb(new Error(errMsg(src, dest, funcName)))
    }
    return checkParentPaths(src, srcStat, destParent, funcName, cb)
  });
}

function checkParentPathsSync (src, srcStat, dest, funcName) {
  const srcParent = path$b.resolve(path$b.dirname(src));
  const destParent = path$b.resolve(path$b.dirname(dest));
  if (destParent === srcParent || destParent === path$b.parse(destParent).root) return
  let destStat;
  try {
    destStat = fs$e.statSync(destParent, { bigint: true });
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }
  if (areIdentical$2(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return checkParentPathsSync(src, srcStat, destParent, funcName)
}

function areIdentical$2 (srcStat, destStat) {
  return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev
}

// return true if dest is a subdir of src, otherwise false.
// It only checks the path strings.
function isSrcSubdir (src, dest) {
  const srcArr = path$b.resolve(src).split(path$b.sep).filter(i => i);
  const destArr = path$b.resolve(dest).split(path$b.sep).filter(i => i);
  return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true)
}

function errMsg (src, dest, funcName) {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`
}

var stat$4 = {
  checkPaths,
  checkPathsSync,
  checkParentPaths,
  checkParentPathsSync,
  isSrcSubdir,
  areIdentical: areIdentical$2
};

const fs$d = gracefulFs;
const path$a = require$$1;
const mkdirsSync$1 = mkdirs$2.mkdirsSync;
const utimesMillisSync = utimes.utimesMillisSync;
const stat$3 = stat$4;

function copySync$2 (src, dest, opts) {
  if (typeof opts === 'function') {
    opts = { filter: opts };
  }

  opts = opts || {};
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true; // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber; // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n
    see https://github.com/jprichardson/node-fs-extra/issues/269`);
  }

  const { srcStat, destStat } = stat$3.checkPathsSync(src, dest, 'copy', opts);
  stat$3.checkParentPathsSync(src, srcStat, dest, 'copy');
  return handleFilterAndCopy(destStat, src, dest, opts)
}

function handleFilterAndCopy (destStat, src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return
  const destParent = path$a.dirname(dest);
  if (!fs$d.existsSync(destParent)) mkdirsSync$1(destParent);
  return getStats$1(destStat, src, dest, opts)
}

function startCopy$1 (destStat, src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return
  return getStats$1(destStat, src, dest, opts)
}

function getStats$1 (destStat, src, dest, opts) {
  const statSync = opts.dereference ? fs$d.statSync : fs$d.lstatSync;
  const srcStat = statSync(src);

  if (srcStat.isDirectory()) return onDir$1(srcStat, destStat, src, dest, opts)
  else if (srcStat.isFile() ||
           srcStat.isCharacterDevice() ||
           srcStat.isBlockDevice()) return onFile$1(srcStat, destStat, src, dest, opts)
  else if (srcStat.isSymbolicLink()) return onLink$1(destStat, src, dest, opts)
  else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`)
  else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`)
  throw new Error(`Unknown file: ${src}`)
}

function onFile$1 (srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile$1(srcStat, src, dest, opts)
  return mayCopyFile$1(srcStat, src, dest, opts)
}

function mayCopyFile$1 (srcStat, src, dest, opts) {
  if (opts.overwrite) {
    fs$d.unlinkSync(dest);
    return copyFile$1(srcStat, src, dest, opts)
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`)
  }
}

function copyFile$1 (srcStat, src, dest, opts) {
  fs$d.copyFileSync(src, dest);
  if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
  return setDestMode$1(dest, srcStat.mode)
}

function handleTimestamps (srcMode, src, dest) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable$1(srcMode)) makeFileWritable$1(dest, srcMode);
  return setDestTimestamps$1(src, dest)
}

function fileIsNotWritable$1 (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable$1 (dest, srcMode) {
  return setDestMode$1(dest, srcMode | 0o200)
}

function setDestMode$1 (dest, srcMode) {
  return fs$d.chmodSync(dest, srcMode)
}

function setDestTimestamps$1 (src, dest) {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  const updatedSrcStat = fs$d.statSync(src);
  return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime)
}

function onDir$1 (srcStat, destStat, src, dest, opts) {
  if (!destStat) return mkDirAndCopy$1(srcStat.mode, src, dest, opts)
  return copyDir$1(src, dest, opts)
}

function mkDirAndCopy$1 (srcMode, src, dest, opts) {
  fs$d.mkdirSync(dest);
  copyDir$1(src, dest, opts);
  return setDestMode$1(dest, srcMode)
}

function copyDir$1 (src, dest, opts) {
  fs$d.readdirSync(src).forEach(item => copyDirItem$1(item, src, dest, opts));
}

function copyDirItem$1 (item, src, dest, opts) {
  const srcItem = path$a.join(src, item);
  const destItem = path$a.join(dest, item);
  const { destStat } = stat$3.checkPathsSync(srcItem, destItem, 'copy', opts);
  return startCopy$1(destStat, srcItem, destItem, opts)
}

function onLink$1 (destStat, src, dest, opts) {
  let resolvedSrc = fs$d.readlinkSync(src);
  if (opts.dereference) {
    resolvedSrc = path$a.resolve(process.cwd(), resolvedSrc);
  }

  if (!destStat) {
    return fs$d.symlinkSync(resolvedSrc, dest)
  } else {
    let resolvedDest;
    try {
      resolvedDest = fs$d.readlinkSync(dest);
    } catch (err) {
      // dest exists and is a regular file or directory,
      // Windows may throw UNKNOWN error. If dest already exists,
      // fs throws error anyway, so no need to guard against it here.
      if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs$d.symlinkSync(resolvedSrc, dest)
      throw err
    }
    if (opts.dereference) {
      resolvedDest = path$a.resolve(process.cwd(), resolvedDest);
    }
    if (stat$3.isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`)
    }

    // prevent copy if src is a subdir of dest since unlinking
    // dest in this case would result in removing src contents
    // and therefore a broken symlink would be created.
    if (fs$d.statSync(dest).isDirectory() && stat$3.isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`)
    }
    return copyLink$1(resolvedSrc, dest)
  }
}

function copyLink$1 (resolvedSrc, dest) {
  fs$d.unlinkSync(dest);
  return fs$d.symlinkSync(resolvedSrc, dest)
}

var copySync_1 = copySync$2;

var copySync$1 = {
  copySync: copySync_1
};

const u$9 = universalify$1.fromPromise;
const fs$c = fs$i;

function pathExists$6 (path) {
  return fs$c.access(path).then(() => true).catch(() => false)
}

var pathExists_1 = {
  pathExists: u$9(pathExists$6),
  pathExistsSync: fs$c.existsSync
};

const fs$b = gracefulFs;
const path$9 = require$$1;
const mkdirs$1 = mkdirs$2.mkdirs;
const pathExists$5 = pathExists_1.pathExists;
const utimesMillis = utimes.utimesMillis;
const stat$2 = stat$4;

function copy$3 (src, dest, opts, cb) {
  if (typeof opts === 'function' && !cb) {
    cb = opts;
    opts = {};
  } else if (typeof opts === 'function') {
    opts = { filter: opts };
  }

  cb = cb || function () {};
  opts = opts || {};

  opts.clobber = 'clobber' in opts ? !!opts.clobber : true; // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber; // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n
    see https://github.com/jprichardson/node-fs-extra/issues/269`);
  }

  stat$2.checkPaths(src, dest, 'copy', opts, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, destStat } = stats;
    stat$2.checkParentPaths(src, srcStat, dest, 'copy', err => {
      if (err) return cb(err)
      if (opts.filter) return handleFilter(checkParentDir, destStat, src, dest, opts, cb)
      return checkParentDir(destStat, src, dest, opts, cb)
    });
  });
}

function checkParentDir (destStat, src, dest, opts, cb) {
  const destParent = path$9.dirname(dest);
  pathExists$5(destParent, (err, dirExists) => {
    if (err) return cb(err)
    if (dirExists) return getStats(destStat, src, dest, opts, cb)
    mkdirs$1(destParent, err => {
      if (err) return cb(err)
      return getStats(destStat, src, dest, opts, cb)
    });
  });
}

function handleFilter (onInclude, destStat, src, dest, opts, cb) {
  Promise.resolve(opts.filter(src, dest)).then(include => {
    if (include) return onInclude(destStat, src, dest, opts, cb)
    return cb()
  }, error => cb(error));
}

function startCopy (destStat, src, dest, opts, cb) {
  if (opts.filter) return handleFilter(getStats, destStat, src, dest, opts, cb)
  return getStats(destStat, src, dest, opts, cb)
}

function getStats (destStat, src, dest, opts, cb) {
  const stat = opts.dereference ? fs$b.stat : fs$b.lstat;
  stat(src, (err, srcStat) => {
    if (err) return cb(err)

    if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts, cb)
    else if (srcStat.isFile() ||
             srcStat.isCharacterDevice() ||
             srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts, cb)
    else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts, cb)
    else if (srcStat.isSocket()) return cb(new Error(`Cannot copy a socket file: ${src}`))
    else if (srcStat.isFIFO()) return cb(new Error(`Cannot copy a FIFO pipe: ${src}`))
    return cb(new Error(`Unknown file: ${src}`))
  });
}

function onFile (srcStat, destStat, src, dest, opts, cb) {
  if (!destStat) return copyFile(srcStat, src, dest, opts, cb)
  return mayCopyFile(srcStat, src, dest, opts, cb)
}

function mayCopyFile (srcStat, src, dest, opts, cb) {
  if (opts.overwrite) {
    fs$b.unlink(dest, err => {
      if (err) return cb(err)
      return copyFile(srcStat, src, dest, opts, cb)
    });
  } else if (opts.errorOnExist) {
    return cb(new Error(`'${dest}' already exists`))
  } else return cb()
}

function copyFile (srcStat, src, dest, opts, cb) {
  fs$b.copyFile(src, dest, err => {
    if (err) return cb(err)
    if (opts.preserveTimestamps) return handleTimestampsAndMode(srcStat.mode, src, dest, cb)
    return setDestMode(dest, srcStat.mode, cb)
  });
}

function handleTimestampsAndMode (srcMode, src, dest, cb) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable(srcMode)) {
    return makeFileWritable(dest, srcMode, err => {
      if (err) return cb(err)
      return setDestTimestampsAndMode(srcMode, src, dest, cb)
    })
  }
  return setDestTimestampsAndMode(srcMode, src, dest, cb)
}

function fileIsNotWritable (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable (dest, srcMode, cb) {
  return setDestMode(dest, srcMode | 0o200, cb)
}

function setDestTimestampsAndMode (srcMode, src, dest, cb) {
  setDestTimestamps(src, dest, err => {
    if (err) return cb(err)
    return setDestMode(dest, srcMode, cb)
  });
}

function setDestMode (dest, srcMode, cb) {
  return fs$b.chmod(dest, srcMode, cb)
}

function setDestTimestamps (src, dest, cb) {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  fs$b.stat(src, (err, updatedSrcStat) => {
    if (err) return cb(err)
    return utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime, cb)
  });
}

function onDir (srcStat, destStat, src, dest, opts, cb) {
  if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts, cb)
  return copyDir(src, dest, opts, cb)
}

function mkDirAndCopy (srcMode, src, dest, opts, cb) {
  fs$b.mkdir(dest, err => {
    if (err) return cb(err)
    copyDir(src, dest, opts, err => {
      if (err) return cb(err)
      return setDestMode(dest, srcMode, cb)
    });
  });
}

function copyDir (src, dest, opts, cb) {
  fs$b.readdir(src, (err, items) => {
    if (err) return cb(err)
    return copyDirItems(items, src, dest, opts, cb)
  });
}

function copyDirItems (items, src, dest, opts, cb) {
  const item = items.pop();
  if (!item) return cb()
  return copyDirItem(items, item, src, dest, opts, cb)
}

function copyDirItem (items, item, src, dest, opts, cb) {
  const srcItem = path$9.join(src, item);
  const destItem = path$9.join(dest, item);
  stat$2.checkPaths(srcItem, destItem, 'copy', opts, (err, stats) => {
    if (err) return cb(err)
    const { destStat } = stats;
    startCopy(destStat, srcItem, destItem, opts, err => {
      if (err) return cb(err)
      return copyDirItems(items, src, dest, opts, cb)
    });
  });
}

function onLink (destStat, src, dest, opts, cb) {
  fs$b.readlink(src, (err, resolvedSrc) => {
    if (err) return cb(err)
    if (opts.dereference) {
      resolvedSrc = path$9.resolve(process.cwd(), resolvedSrc);
    }

    if (!destStat) {
      return fs$b.symlink(resolvedSrc, dest, cb)
    } else {
      fs$b.readlink(dest, (err, resolvedDest) => {
        if (err) {
          // dest exists and is a regular file or directory,
          // Windows may throw UNKNOWN error. If dest already exists,
          // fs throws error anyway, so no need to guard against it here.
          if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs$b.symlink(resolvedSrc, dest, cb)
          return cb(err)
        }
        if (opts.dereference) {
          resolvedDest = path$9.resolve(process.cwd(), resolvedDest);
        }
        if (stat$2.isSrcSubdir(resolvedSrc, resolvedDest)) {
          return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`))
        }

        // do not copy if src is a subdir of dest since unlinking
        // dest in this case would result in removing src contents
        // and therefore a broken symlink would be created.
        if (destStat.isDirectory() && stat$2.isSrcSubdir(resolvedDest, resolvedSrc)) {
          return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`))
        }
        return copyLink(resolvedSrc, dest, cb)
      });
    }
  });
}

function copyLink (resolvedSrc, dest, cb) {
  fs$b.unlink(dest, err => {
    if (err) return cb(err)
    return fs$b.symlink(resolvedSrc, dest, cb)
  });
}

var copy_1 = copy$3;

const u$8 = universalify$1.fromCallback;
var copy$2 = {
  copy: u$8(copy_1)
};

const fs$a = gracefulFs;
const path$8 = require$$1;
const assert = require$$5;

const isWindows = (process.platform === 'win32');

function defaults (options) {
  const methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ];
  methods.forEach(m => {
    options[m] = options[m] || fs$a[m];
    m = m + 'Sync';
    options[m] = options[m] || fs$a[m];
  });

  options.maxBusyTries = options.maxBusyTries || 3;
}

function rimraf$1 (p, options, cb) {
  let busyTries = 0;

  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  assert(p, 'rimraf: missing path');
  assert.strictEqual(typeof p, 'string', 'rimraf: path should be a string');
  assert.strictEqual(typeof cb, 'function', 'rimraf: callback function required');
  assert(options, 'rimraf: invalid options argument provided');
  assert.strictEqual(typeof options, 'object', 'rimraf: options should be object');

  defaults(options);

  rimraf_(p, options, function CB (er) {
    if (er) {
      if ((er.code === 'EBUSY' || er.code === 'ENOTEMPTY' || er.code === 'EPERM') &&
          busyTries < options.maxBusyTries) {
        busyTries++;
        const time = busyTries * 100;
        // try again, with the same exact callback as this one.
        return setTimeout(() => rimraf_(p, options, CB), time)
      }

      // already gone
      if (er.code === 'ENOENT') er = null;
    }

    cb(er);
  });
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_ (p, options, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function');

  // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.
  options.lstat(p, (er, st) => {
    if (er && er.code === 'ENOENT') {
      return cb(null)
    }

    // Windows can EPERM on stat.  Life is suffering.
    if (er && er.code === 'EPERM' && isWindows) {
      return fixWinEPERM(p, options, er, cb)
    }

    if (st && st.isDirectory()) {
      return rmdir(p, options, er, cb)
    }

    options.unlink(p, er => {
      if (er) {
        if (er.code === 'ENOENT') {
          return cb(null)
        }
        if (er.code === 'EPERM') {
          return (isWindows)
            ? fixWinEPERM(p, options, er, cb)
            : rmdir(p, options, er, cb)
        }
        if (er.code === 'EISDIR') {
          return rmdir(p, options, er, cb)
        }
      }
      return cb(er)
    });
  });
}

function fixWinEPERM (p, options, er, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function');

  options.chmod(p, 0o666, er2 => {
    if (er2) {
      cb(er2.code === 'ENOENT' ? null : er);
    } else {
      options.stat(p, (er3, stats) => {
        if (er3) {
          cb(er3.code === 'ENOENT' ? null : er);
        } else if (stats.isDirectory()) {
          rmdir(p, options, er, cb);
        } else {
          options.unlink(p, cb);
        }
      });
    }
  });
}

function fixWinEPERMSync (p, options, er) {
  let stats;

  assert(p);
  assert(options);

  try {
    options.chmodSync(p, 0o666);
  } catch (er2) {
    if (er2.code === 'ENOENT') {
      return
    } else {
      throw er
    }
  }

  try {
    stats = options.statSync(p);
  } catch (er3) {
    if (er3.code === 'ENOENT') {
      return
    } else {
      throw er
    }
  }

  if (stats.isDirectory()) {
    rmdirSync(p, options, er);
  } else {
    options.unlinkSync(p);
  }
}

function rmdir (p, options, originalEr, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function');

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, er => {
    if (er && (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM')) {
      rmkids(p, options, cb);
    } else if (er && er.code === 'ENOTDIR') {
      cb(originalEr);
    } else {
      cb(er);
    }
  });
}

function rmkids (p, options, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function');

  options.readdir(p, (er, files) => {
    if (er) return cb(er)

    let n = files.length;
    let errState;

    if (n === 0) return options.rmdir(p, cb)

    files.forEach(f => {
      rimraf$1(path$8.join(p, f), options, er => {
        if (errState) {
          return
        }
        if (er) return cb(errState = er)
        if (--n === 0) {
          options.rmdir(p, cb);
        }
      });
    });
  });
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync (p, options) {
  let st;

  options = options || {};
  defaults(options);

  assert(p, 'rimraf: missing path');
  assert.strictEqual(typeof p, 'string', 'rimraf: path should be a string');
  assert(options, 'rimraf: missing options');
  assert.strictEqual(typeof options, 'object', 'rimraf: options should be object');

  try {
    st = options.lstatSync(p);
  } catch (er) {
    if (er.code === 'ENOENT') {
      return
    }

    // Windows can EPERM on stat.  Life is suffering.
    if (er.code === 'EPERM' && isWindows) {
      fixWinEPERMSync(p, options, er);
    }
  }

  try {
    // sunos lets the root user unlink directories, which is... weird.
    if (st && st.isDirectory()) {
      rmdirSync(p, options, null);
    } else {
      options.unlinkSync(p);
    }
  } catch (er) {
    if (er.code === 'ENOENT') {
      return
    } else if (er.code === 'EPERM') {
      return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
    } else if (er.code !== 'EISDIR') {
      throw er
    }
    rmdirSync(p, options, er);
  }
}

function rmdirSync (p, options, originalEr) {
  assert(p);
  assert(options);

  try {
    options.rmdirSync(p);
  } catch (er) {
    if (er.code === 'ENOTDIR') {
      throw originalEr
    } else if (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM') {
      rmkidsSync(p, options);
    } else if (er.code !== 'ENOENT') {
      throw er
    }
  }
}

function rmkidsSync (p, options) {
  assert(p);
  assert(options);
  options.readdirSync(p).forEach(f => rimrafSync(path$8.join(p, f), options));

  if (isWindows) {
    // We only end up here once we got ENOTEMPTY at least once, and
    // at this point, we are guaranteed to have removed all the kids.
    // So, we know that it won't be ENOENT or ENOTDIR or anything else.
    // try really hard to delete stuff on windows, because it has a
    // PROFOUNDLY annoying habit of not closing handles promptly when
    // files are deleted, resulting in spurious ENOTEMPTY errors.
    const startTime = Date.now();
    do {
      try {
        const ret = options.rmdirSync(p, options);
        return ret
      } catch {}
    } while (Date.now() - startTime < 500) // give up after 500ms
  } else {
    const ret = options.rmdirSync(p, options);
    return ret
  }
}

var rimraf_1 = rimraf$1;
rimraf$1.sync = rimrafSync;

const fs$9 = gracefulFs;
const u$7 = universalify$1.fromCallback;
const rimraf = rimraf_1;

function remove$2 (path, callback) {
  // Node 14.14.0+
  if (fs$9.rm) return fs$9.rm(path, { recursive: true, force: true }, callback)
  rimraf(path, callback);
}

function removeSync$1 (path) {
  // Node 14.14.0+
  if (fs$9.rmSync) return fs$9.rmSync(path, { recursive: true, force: true })
  rimraf.sync(path);
}

var remove_1 = {
  remove: u$7(remove$2),
  removeSync: removeSync$1
};

const u$6 = universalify$1.fromPromise;
const fs$8 = fs$i;
const path$7 = require$$1;
const mkdir$3 = mkdirs$2;
const remove$1 = remove_1;

const emptyDir = u$6(async function emptyDir (dir) {
  let items;
  try {
    items = await fs$8.readdir(dir);
  } catch {
    return mkdir$3.mkdirs(dir)
  }

  return Promise.all(items.map(item => remove$1.remove(path$7.join(dir, item))))
});

function emptyDirSync (dir) {
  let items;
  try {
    items = fs$8.readdirSync(dir);
  } catch {
    return mkdir$3.mkdirsSync(dir)
  }

  items.forEach(item => {
    item = path$7.join(dir, item);
    remove$1.removeSync(item);
  });
}

var empty = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
};

const u$5 = universalify$1.fromCallback;
const path$6 = require$$1;
const fs$7 = gracefulFs;
const mkdir$2 = mkdirs$2;

function createFile (file, callback) {
  function makeFile () {
    fs$7.writeFile(file, '', err => {
      if (err) return callback(err)
      callback();
    });
  }

  fs$7.stat(file, (err, stats) => { // eslint-disable-line handle-callback-err
    if (!err && stats.isFile()) return callback()
    const dir = path$6.dirname(file);
    fs$7.stat(dir, (err, stats) => {
      if (err) {
        // if the directory doesn't exist, make it
        if (err.code === 'ENOENT') {
          return mkdir$2.mkdirs(dir, err => {
            if (err) return callback(err)
            makeFile();
          })
        }
        return callback(err)
      }

      if (stats.isDirectory()) makeFile();
      else {
        // parent is not a directory
        // This is just to cause an internal ENOTDIR error to be thrown
        fs$7.readdir(dir, err => {
          if (err) return callback(err)
        });
      }
    });
  });
}

function createFileSync (file) {
  let stats;
  try {
    stats = fs$7.statSync(file);
  } catch {}
  if (stats && stats.isFile()) return

  const dir = path$6.dirname(file);
  try {
    if (!fs$7.statSync(dir).isDirectory()) {
      // parent is not a directory
      // This is just to cause an internal ENOTDIR error to be thrown
      fs$7.readdirSync(dir);
    }
  } catch (err) {
    // If the stat call above failed because the directory doesn't exist, create it
    if (err && err.code === 'ENOENT') mkdir$2.mkdirsSync(dir);
    else throw err
  }

  fs$7.writeFileSync(file, '');
}

var file$1 = {
  createFile: u$5(createFile),
  createFileSync
};

const u$4 = universalify$1.fromCallback;
const path$5 = require$$1;
const fs$6 = gracefulFs;
const mkdir$1 = mkdirs$2;
const pathExists$4 = pathExists_1.pathExists;
const { areIdentical: areIdentical$1 } = stat$4;

function createLink (srcpath, dstpath, callback) {
  function makeLink (srcpath, dstpath) {
    fs$6.link(srcpath, dstpath, err => {
      if (err) return callback(err)
      callback(null);
    });
  }

  fs$6.lstat(dstpath, (_, dstStat) => {
    fs$6.lstat(srcpath, (err, srcStat) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureLink');
        return callback(err)
      }
      if (dstStat && areIdentical$1(srcStat, dstStat)) return callback(null)

      const dir = path$5.dirname(dstpath);
      pathExists$4(dir, (err, dirExists) => {
        if (err) return callback(err)
        if (dirExists) return makeLink(srcpath, dstpath)
        mkdir$1.mkdirs(dir, err => {
          if (err) return callback(err)
          makeLink(srcpath, dstpath);
        });
      });
    });
  });
}

function createLinkSync (srcpath, dstpath) {
  let dstStat;
  try {
    dstStat = fs$6.lstatSync(dstpath);
  } catch {}

  try {
    const srcStat = fs$6.lstatSync(srcpath);
    if (dstStat && areIdentical$1(srcStat, dstStat)) return
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink');
    throw err
  }

  const dir = path$5.dirname(dstpath);
  const dirExists = fs$6.existsSync(dir);
  if (dirExists) return fs$6.linkSync(srcpath, dstpath)
  mkdir$1.mkdirsSync(dir);

  return fs$6.linkSync(srcpath, dstpath)
}

var link$1 = {
  createLink: u$4(createLink),
  createLinkSync
};

const path$4 = require$$1;
const fs$5 = gracefulFs;
const pathExists$3 = pathExists_1.pathExists;

/**
 * Function that returns two types of paths, one relative to symlink, and one
 * relative to the current working directory. Checks if path is absolute or
 * relative. If the path is relative, this function checks if the path is
 * relative to symlink or relative to current working directory. This is an
 * initiative to find a smarter `srcpath` to supply when building symlinks.
 * This allows you to determine which path to use out of one of three possible
 * types of source paths. The first is an absolute path. This is detected by
 * `path.isAbsolute()`. When an absolute path is provided, it is checked to
 * see if it exists. If it does it's used, if not an error is returned
 * (callback)/ thrown (sync). The other two options for `srcpath` are a
 * relative url. By default Node's `fs.symlink` works by creating a symlink
 * using `dstpath` and expects the `srcpath` to be relative to the newly
 * created symlink. If you provide a `srcpath` that does not exist on the file
 * system it results in a broken symlink. To minimize this, the function
 * checks to see if the 'relative to symlink' source file exists, and if it
 * does it will use it. If it does not, it checks if there's a file that
 * exists that is relative to the current working directory, if does its used.
 * This preserves the expectations of the original fs.symlink spec and adds
 * the ability to pass in `relative to current working direcotry` paths.
 */

function symlinkPaths$1 (srcpath, dstpath, callback) {
  if (path$4.isAbsolute(srcpath)) {
    return fs$5.lstat(srcpath, (err) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureSymlink');
        return callback(err)
      }
      return callback(null, {
        toCwd: srcpath,
        toDst: srcpath
      })
    })
  } else {
    const dstdir = path$4.dirname(dstpath);
    const relativeToDst = path$4.join(dstdir, srcpath);
    return pathExists$3(relativeToDst, (err, exists) => {
      if (err) return callback(err)
      if (exists) {
        return callback(null, {
          toCwd: relativeToDst,
          toDst: srcpath
        })
      } else {
        return fs$5.lstat(srcpath, (err) => {
          if (err) {
            err.message = err.message.replace('lstat', 'ensureSymlink');
            return callback(err)
          }
          return callback(null, {
            toCwd: srcpath,
            toDst: path$4.relative(dstdir, srcpath)
          })
        })
      }
    })
  }
}

function symlinkPathsSync$1 (srcpath, dstpath) {
  let exists;
  if (path$4.isAbsolute(srcpath)) {
    exists = fs$5.existsSync(srcpath);
    if (!exists) throw new Error('absolute srcpath does not exist')
    return {
      toCwd: srcpath,
      toDst: srcpath
    }
  } else {
    const dstdir = path$4.dirname(dstpath);
    const relativeToDst = path$4.join(dstdir, srcpath);
    exists = fs$5.existsSync(relativeToDst);
    if (exists) {
      return {
        toCwd: relativeToDst,
        toDst: srcpath
      }
    } else {
      exists = fs$5.existsSync(srcpath);
      if (!exists) throw new Error('relative srcpath does not exist')
      return {
        toCwd: srcpath,
        toDst: path$4.relative(dstdir, srcpath)
      }
    }
  }
}

var symlinkPaths_1 = {
  symlinkPaths: symlinkPaths$1,
  symlinkPathsSync: symlinkPathsSync$1
};

const fs$4 = gracefulFs;

function symlinkType$1 (srcpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback;
  type = (typeof type === 'function') ? false : type;
  if (type) return callback(null, type)
  fs$4.lstat(srcpath, (err, stats) => {
    if (err) return callback(null, 'file')
    type = (stats && stats.isDirectory()) ? 'dir' : 'file';
    callback(null, type);
  });
}

function symlinkTypeSync$1 (srcpath, type) {
  let stats;

  if (type) return type
  try {
    stats = fs$4.lstatSync(srcpath);
  } catch {
    return 'file'
  }
  return (stats && stats.isDirectory()) ? 'dir' : 'file'
}

var symlinkType_1 = {
  symlinkType: symlinkType$1,
  symlinkTypeSync: symlinkTypeSync$1
};

const u$3 = universalify$1.fromCallback;
const path$3 = require$$1;
const fs$3 = fs$i;
const _mkdirs = mkdirs$2;
const mkdirs = _mkdirs.mkdirs;
const mkdirsSync = _mkdirs.mkdirsSync;

const _symlinkPaths = symlinkPaths_1;
const symlinkPaths = _symlinkPaths.symlinkPaths;
const symlinkPathsSync = _symlinkPaths.symlinkPathsSync;

const _symlinkType = symlinkType_1;
const symlinkType = _symlinkType.symlinkType;
const symlinkTypeSync = _symlinkType.symlinkTypeSync;

const pathExists$2 = pathExists_1.pathExists;

const { areIdentical } = stat$4;

function createSymlink (srcpath, dstpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback;
  type = (typeof type === 'function') ? false : type;

  fs$3.lstat(dstpath, (err, stats) => {
    if (!err && stats.isSymbolicLink()) {
      Promise.all([
        fs$3.stat(srcpath),
        fs$3.stat(dstpath)
      ]).then(([srcStat, dstStat]) => {
        if (areIdentical(srcStat, dstStat)) return callback(null)
        _createSymlink(srcpath, dstpath, type, callback);
      });
    } else _createSymlink(srcpath, dstpath, type, callback);
  });
}

function _createSymlink (srcpath, dstpath, type, callback) {
  symlinkPaths(srcpath, dstpath, (err, relative) => {
    if (err) return callback(err)
    srcpath = relative.toDst;
    symlinkType(relative.toCwd, type, (err, type) => {
      if (err) return callback(err)
      const dir = path$3.dirname(dstpath);
      pathExists$2(dir, (err, dirExists) => {
        if (err) return callback(err)
        if (dirExists) return fs$3.symlink(srcpath, dstpath, type, callback)
        mkdirs(dir, err => {
          if (err) return callback(err)
          fs$3.symlink(srcpath, dstpath, type, callback);
        });
      });
    });
  });
}

function createSymlinkSync (srcpath, dstpath, type) {
  let stats;
  try {
    stats = fs$3.lstatSync(dstpath);
  } catch {}
  if (stats && stats.isSymbolicLink()) {
    const srcStat = fs$3.statSync(srcpath);
    const dstStat = fs$3.statSync(dstpath);
    if (areIdentical(srcStat, dstStat)) return
  }

  const relative = symlinkPathsSync(srcpath, dstpath);
  srcpath = relative.toDst;
  type = symlinkTypeSync(relative.toCwd, type);
  const dir = path$3.dirname(dstpath);
  const exists = fs$3.existsSync(dir);
  if (exists) return fs$3.symlinkSync(srcpath, dstpath, type)
  mkdirsSync(dir);
  return fs$3.symlinkSync(srcpath, dstpath, type)
}

var symlink$1 = {
  createSymlink: u$3(createSymlink),
  createSymlinkSync
};

const file = file$1;
const link = link$1;
const symlink = symlink$1;

var ensure = {
  // file
  createFile: file.createFile,
  createFileSync: file.createFileSync,
  ensureFile: file.createFile,
  ensureFileSync: file.createFileSync,
  // link
  createLink: link.createLink,
  createLinkSync: link.createLinkSync,
  ensureLink: link.createLink,
  ensureLinkSync: link.createLinkSync,
  // symlink
  createSymlink: symlink.createSymlink,
  createSymlinkSync: symlink.createSymlinkSync,
  ensureSymlink: symlink.createSymlink,
  ensureSymlinkSync: symlink.createSymlinkSync
};

function stringify$4 (obj, { EOL = '\n', finalEOL = true, replacer = null, spaces } = {}) {
  const EOF = finalEOL ? EOL : '';
  const str = JSON.stringify(obj, replacer, spaces);

  return str.replace(/\n/g, EOL) + EOF
}

function stripBom$1 (content) {
  // we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
  if (Buffer.isBuffer(content)) content = content.toString('utf8');
  return content.replace(/^\uFEFF/, '')
}

var utils = { stringify: stringify$4, stripBom: stripBom$1 };

let _fs;
try {
  _fs = require('graceful-fs');
} catch (_) {
  _fs = require$$0$2;
}
const universalify = universalify$1;
const { stringify: stringify$3, stripBom } = utils;

async function _readFile (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options };
  }

  const fs = options.fs || _fs;

  const shouldThrow = 'throws' in options ? options.throws : true;

  let data = await universalify.fromCallback(fs.readFile)(file, options);

  data = stripBom(data);

  let obj;
  try {
    obj = JSON.parse(data, options ? options.reviver : null);
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`;
      throw err
    } else {
      return null
    }
  }

  return obj
}

const readFile = universalify.fromPromise(_readFile);

function readFileSync (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options };
  }

  const fs = options.fs || _fs;

  const shouldThrow = 'throws' in options ? options.throws : true;

  try {
    let content = fs.readFileSync(file, options);
    content = stripBom(content);
    return JSON.parse(content, options.reviver)
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`;
      throw err
    } else {
      return null
    }
  }
}

async function _writeFile (file, obj, options = {}) {
  const fs = options.fs || _fs;

  const str = stringify$3(obj, options);

  await universalify.fromCallback(fs.writeFile)(file, str, options);
}

const writeFile = universalify.fromPromise(_writeFile);

function writeFileSync (file, obj, options = {}) {
  const fs = options.fs || _fs;

  const str = stringify$3(obj, options);
  // not sure if fs.writeFileSync returns anything, but just in case
  return fs.writeFileSync(file, str, options)
}

const jsonfile$1 = {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync
};

var jsonfile_1 = jsonfile$1;

const jsonFile$1 = jsonfile_1;

var jsonfile = {
  // jsonfile exports
  readJson: jsonFile$1.readFile,
  readJsonSync: jsonFile$1.readFileSync,
  writeJson: jsonFile$1.writeFile,
  writeJsonSync: jsonFile$1.writeFileSync
};

const u$2 = universalify$1.fromCallback;
const fs$2 = gracefulFs;
const path$2 = require$$1;
const mkdir = mkdirs$2;
const pathExists$1 = pathExists_1.pathExists;

function outputFile$2 (file, data, encoding, callback) {
  if (typeof encoding === 'function') {
    callback = encoding;
    encoding = 'utf8';
  }

  const dir = path$2.dirname(file);
  pathExists$1(dir, (err, itDoes) => {
    if (err) return callback(err)
    if (itDoes) return fs$2.writeFile(file, data, encoding, callback)

    mkdir.mkdirs(dir, err => {
      if (err) return callback(err)

      fs$2.writeFile(file, data, encoding, callback);
    });
  });
}

function outputFileSync$1 (file, ...args) {
  const dir = path$2.dirname(file);
  if (fs$2.existsSync(dir)) {
    return fs$2.writeFileSync(file, ...args)
  }
  mkdir.mkdirsSync(dir);
  fs$2.writeFileSync(file, ...args);
}

var output = {
  outputFile: u$2(outputFile$2),
  outputFileSync: outputFileSync$1
};

const { stringify: stringify$2 } = utils;
const { outputFile: outputFile$1 } = output;

async function outputJson (file, data, options = {}) {
  const str = stringify$2(data, options);

  await outputFile$1(file, str, options);
}

var outputJson_1 = outputJson;

const { stringify: stringify$1 } = utils;
const { outputFileSync } = output;

function outputJsonSync (file, data, options) {
  const str = stringify$1(data, options);

  outputFileSync(file, str, options);
}

var outputJsonSync_1 = outputJsonSync;

const u$1 = universalify$1.fromPromise;
const jsonFile = jsonfile;

jsonFile.outputJson = u$1(outputJson_1);
jsonFile.outputJsonSync = outputJsonSync_1;
// aliases
jsonFile.outputJSON = jsonFile.outputJson;
jsonFile.outputJSONSync = jsonFile.outputJsonSync;
jsonFile.writeJSON = jsonFile.writeJson;
jsonFile.writeJSONSync = jsonFile.writeJsonSync;
jsonFile.readJSON = jsonFile.readJson;
jsonFile.readJSONSync = jsonFile.readJsonSync;

var json = jsonFile;

const fs$1 = gracefulFs;
const path$1 = require$$1;
const copySync = copySync$1.copySync;
const removeSync = remove_1.removeSync;
const mkdirpSync = mkdirs$2.mkdirpSync;
const stat$1 = stat$4;

function moveSync$1 (src, dest, opts) {
  opts = opts || {};
  const overwrite = opts.overwrite || opts.clobber || false;

  const { srcStat, isChangingCase = false } = stat$1.checkPathsSync(src, dest, 'move', opts);
  stat$1.checkParentPathsSync(src, srcStat, dest, 'move');
  if (!isParentRoot$1(dest)) mkdirpSync(path$1.dirname(dest));
  return doRename$1(src, dest, overwrite, isChangingCase)
}

function isParentRoot$1 (dest) {
  const parent = path$1.dirname(dest);
  const parsedPath = path$1.parse(parent);
  return parsedPath.root === parent
}

function doRename$1 (src, dest, overwrite, isChangingCase) {
  if (isChangingCase) return rename$1(src, dest, overwrite)
  if (overwrite) {
    removeSync(dest);
    return rename$1(src, dest, overwrite)
  }
  if (fs$1.existsSync(dest)) throw new Error('dest already exists.')
  return rename$1(src, dest, overwrite)
}

function rename$1 (src, dest, overwrite) {
  try {
    fs$1.renameSync(src, dest);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err
    return moveAcrossDevice$1(src, dest, overwrite)
  }
}

function moveAcrossDevice$1 (src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true
  };
  copySync(src, dest, opts);
  return removeSync(src)
}

var moveSync_1 = moveSync$1;

var moveSync = {
  moveSync: moveSync_1
};

const fs = gracefulFs;
const path = require$$1;
const copy$1 = copy$2.copy;
const remove = remove_1.remove;
const mkdirp = mkdirs$2.mkdirp;
const pathExists = pathExists_1.pathExists;
const stat = stat$4;

function move$1 (src, dest, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  const overwrite = opts.overwrite || opts.clobber || false;

  stat.checkPaths(src, dest, 'move', opts, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, isChangingCase = false } = stats;
    stat.checkParentPaths(src, srcStat, dest, 'move', err => {
      if (err) return cb(err)
      if (isParentRoot(dest)) return doRename(src, dest, overwrite, isChangingCase, cb)
      mkdirp(path.dirname(dest), err => {
        if (err) return cb(err)
        return doRename(src, dest, overwrite, isChangingCase, cb)
      });
    });
  });
}

function isParentRoot (dest) {
  const parent = path.dirname(dest);
  const parsedPath = path.parse(parent);
  return parsedPath.root === parent
}

function doRename (src, dest, overwrite, isChangingCase, cb) {
  if (isChangingCase) return rename(src, dest, overwrite, cb)
  if (overwrite) {
    return remove(dest, err => {
      if (err) return cb(err)
      return rename(src, dest, overwrite, cb)
    })
  }
  pathExists(dest, (err, destExists) => {
    if (err) return cb(err)
    if (destExists) return cb(new Error('dest already exists.'))
    return rename(src, dest, overwrite, cb)
  });
}

function rename (src, dest, overwrite, cb) {
  fs.rename(src, dest, err => {
    if (!err) return cb()
    if (err.code !== 'EXDEV') return cb(err)
    return moveAcrossDevice(src, dest, overwrite, cb)
  });
}

function moveAcrossDevice (src, dest, overwrite, cb) {
  const opts = {
    overwrite,
    errorOnExist: true
  };
  copy$1(src, dest, opts, err => {
    if (err) return cb(err)
    return remove(src, cb)
  });
}

var move_1 = move$1;

const u = universalify$1.fromCallback;
var move = {
  move: u(move_1)
};

var lib = {
  // Export promiseified graceful-fs:
  ...fs$i,
  // Export extra methods:
  ...copySync$1,
  ...copy$2,
  ...empty,
  ...ensure,
  ...json,
  ...mkdirs$2,
  ...moveSync,
  ...move,
  ...output,
  ...pathExists_1,
  ...remove_1
};

var __dirname$1 = resolve$1(import.meta.url.replace("file:///", ""), "../");

/*!
 * String.prototype.codePointAt v0.2.0 | MIT (c) Mathias Bynens (@mathias)
 * http://mths.be/codepointat
 *
 * code-point | MIT (c) Shinnosuke Watanabe
 * https://github.com/shinnn/code-point.js
*/

var getCodePoint = typeof String.prototype.codePointAt === 'function' ? function getCodePoint(str) {
  return str.codePointAt(0);
} : function getCodePoint(str) {
  var first = str.charCodeAt(0);

  if (first >= 0xD800 && first <= 0xDBFF && str.length > 1) {
    var second = str.charCodeAt(1);

    if (second >= 0xDC00 && second <= 0xDFFF) {
      return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
    }
  }

  return first;
};

var codePoint$1 = function codePoint(str) {
  if (typeof str !== 'string') {
    throw new TypeError(String(str) + ' is not a string. Argument must be a string.');
  }

  if (str.length === 0) {
    throw new Error('Argument must be a non-empty string.');
  }

  return getCodePoint(str);
};

/*!
 * code-points | MIT (c) Shinnosuke Watanabe
 * https://github.com/shinnn/code-points.js
*/

function codePoints(str, option) {

  option = option || {unique: false};

  if (typeof str !== 'string') {
    throw new TypeError(
      str +
      ' is not a string. First argument to code-points must be a string.'
    );
  }

  var result = [];

  var index = 0;
  while (index < str.length) {
    var point = codePoint(str.charAt(index) + str.charAt(index + 1));

    if (point > 0xffff) {
      index += 2;
    } else {
      index += 1;
    }

    if (option.unique && result.indexOf(point) !== -1) {
      continue;
    }

    result.push(point);
  }

  return result;
}

var codePoint = codePoint$1;
var codePointsCjs = codePoints;

function getUnicodeRangeArray(str) {
    return codePointsCjs(str, {
        unique: true,
    });
}

// {
//     common: true, //简繁共有部分
//     SC: true, // 简体
//     other: true, // 非中文及一些符号
//     TC: true, // 繁体
//     ...charset,
// }
function loadTC() {
    let TC = lib
        .readFileSync(resolve$1(__dirname$1, "./charset/TCDiff.txt"), {
            encoding: "utf-8",
        })
        .split("")
        .filter((_, i) => !(i % 2))
        .join("");
    return TC;
}
function prepareCharset(config) {
    let charset = {
        SC: [],
        TC: [],
        other: [],
    };
    // 只要是 简体或者使用了 common 就先导入基本的文件
    if (config.SC) {
        charset.SC = lib.readFileSync(resolve$1(__dirname$1, "./charset/SC.txt"), {
            encoding: "utf-8",
        });
    }

    if (config.TC) {
        charset.TC = loadTC();
    }

    if (config.other) {
        charset.other = lib.readFileSync(
            resolve$1(__dirname$1, "./charset/symbol.txt"),
            {
                encoding: "utf-8",
            }
        );
    }

    return {
        SC: getUnicodeRangeArray(charset.SC),
        TC: getUnicodeRangeArray(charset.TC),
        other: getUnicodeRangeArray(charset.other),
    };
}

let urlAlphabet =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

const POOL_SIZE_MULTIPLIER = 128;
let pool, poolOffset;
let fillPool = bytes => {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    crypto.randomFillSync(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    crypto.randomFillSync(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
};
let nanoid = (size = 21) => {
  fillPool(size);
  let id = '';
  for (let i = poolOffset - size; i < poolOffset; i++) {
    id += urlAlphabet[pool[i] & 63];
  }
  return id
};

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * @file Buffer和ArrayBuffer转换
 * @author mengke01(kekee000@gmail.com)
 */

/* eslint-disable no-undef */
var bufferTool = {

    /**
     * Buffer转换成ArrayBuffer
     *
     * @param {Buffer} buffer 缓冲数组
     * @return {ArrayBuffer}
     */
    toArrayBuffer(buffer) {
        const length = buffer.length;
        const view = new DataView(new ArrayBuffer(length), 0, length);
        for (let i = 0, l = length; i < l; i++) {
            view.setUint8(i, buffer[i], false);
        }
        return view.buffer;
    },

    /**
     * ArrayBuffer转换成Buffer
     *
     * @param {ArrayBuffer} arrayBuffer 缓冲数组
     * @return {Buffer}
     */
    toBuffer(arrayBuffer) {
        if (Array.isArray(arrayBuffer)) {
            return Buffer.from(arrayBuffer);
        }

        const length = arrayBuffer.byteLength;
        const view = new DataView(arrayBuffer, 0, length);
        const buffer = Buffer.alloc(length);
        for (let i = 0, l = length; i < l; i++) {
            buffer[i] = view.getUint8(i, false);
        }
        return buffer;
    }
};

/**
 * @file 语言相关函数
 * @author mengke01(kekee000@gmail.com)
 */


function isArray(obj) {
    return obj != null && toString.call(obj).slice(8, -1) === 'Array';
}

function isObject$1(obj) {
    return obj != null && toString.call(obj).slice(8, -1) === 'Object';
}

function isEmptyObject(object) {
    for (const name in object) {
        // eslint-disable-next-line no-prototype-builtins
        if (object.hasOwnProperty(name)) {
            return false;
        }
    }
    return true;
}

/**
 * 为函数提前绑定前置参数（柯里化）
 *
 * @see http://en.wikipedia.org/wiki/Currying
 * @param {Function} fn 要绑定的函数
 * @param {...Array} cargs cargs
 * @return {Function}
 */
function curry(fn, ...cargs) {
    return function (...rargs) {
        const args = cargs.concat(rargs);
        // eslint-disable-next-line no-invalid-this
        return fn.apply(this, args);
    };
}


/**
 * 设置覆盖相关的属性值
 *
 * @param {Object} thisObj 覆盖对象
 * @param {Object} thatObj 值对象
 * @param {Array.<string>} fields 字段
 * @return {Object} thisObj
 */
function overwrite(thisObj, thatObj, fields) {

    if (!thatObj) {
        return thisObj;
    }

    // 这里`fields`未指定则仅overwrite自身可枚举的字段，指定`fields`则不做限制
    fields = fields || Object.keys(thatObj);
    fields.forEach(field => {
        // 拷贝对象
        if (
            thisObj[field] && typeof thisObj[field] === 'object'
            && thatObj[field] && typeof thatObj[field] === 'object'
        ) {
            overwrite(thisObj[field], thatObj[field]);
        }
        else {
            thisObj[field] = thatObj[field];
        }
    });

    return thisObj;
}

/**
 * 深复制对象，仅复制数据
 *
 * @param {Object} source 源数据
 * @return {Object} 复制的数据
 */
function clone(source) {
    if (!source || typeof source !== 'object') {
        return source;
    }

    let cloned = source;

    if (isArray(source)) {
        cloned = source.slice().map(clone);
    }
    else if (isObject$1(source) && 'isPrototypeOf' in source) {
        cloned = {};
        for (const key of Object.keys(source)) {
            cloned[key] = clone(source[key]);
        }
    }

    return cloned;
}

/**
 * @file 空的ttf格式json对象
 * @author mengke01(kekee000@gmail.com)
 */

/* eslint-disable  */
var emptyttf = {
    "version": 1,
    "numTables": 10,
    "searchRange": 128,
    "entrySelector": 3,
    "rangeShift": 64,
    "head": {
        "version": 1,
        "fontRevision": 1,
        "checkSumAdjustment": 0,
        "magickNumber": 1594834165,
        "flags": 11,
        "unitsPerEm": 1024,
        "created": 1428940800000,
        "modified": 1428940800000,
        "xMin": 34,
        "yMin": 0,
        "xMax": 306,
        "yMax": 682,
        "macStyle": 0,
        "lowestRecPPEM": 8,
        "fontDirectionHint": 2,
        "indexToLocFormat": 0,
        "glyphDataFormat": 0
    },
    "glyf": [{
        "contours": [
            [{
                "x": 34,
                "y": 0,
                "onCurve": true
            }, {
                "x": 34,
                "y": 682,
                "onCurve": true
            }, {
                "x": 306,
                "y": 682,
                "onCurve": true
            }, {
                "x": 306,
                "y": 0,
                "onCurve": true
            }],
            [{
                "x": 68,
                "y": 34,
                "onCurve": true
            }, {
                "x": 272,
                "y": 34,
                "onCurve": true
            }, {
                "x": 272,
                "y": 648,
                "onCurve": true
            }, {
                "x": 68,
                "y": 648,
                "onCurve": true
            }]
        ],
        "xMin": 34,
        "yMin": 0,
        "xMax": 306,
        "yMax": 682,
        "advanceWidth": 374,
        "leftSideBearing": 34,
        "name": ".notdef"
    }],
    "cmap": {},
    "name": {
        "fontFamily": "fonteditor",
        "fontSubFamily": "Medium",
        "uniqueSubFamily": "FontEditor 1.0 : fonteditor",
        "version": "Version 1.0 ; FontEditor (v0.0.1)",
        "postScriptName": "fonteditor",
        "fullName": "fonteditor"
    },
    "hhea": {
        "version": 1,
        "ascent": 812,
        "descent": -212,
        "lineGap": 92,
        "advanceWidthMax": 374,
        "minLeftSideBearing": 34,
        "minRightSideBearing": 68,
        "xMaxExtent": 306,
        "caretSlopeRise": 1,
        "caretSlopeRun": 0,
        "caretOffset": 0,
        "reserved0": 0,
        "reserved1": 0,
        "reserved2": 0,
        "reserved3": 0,
        "metricDataFormat": 0,
        "numOfLongHorMetrics": 1
    },
    "post": {
        "italicAngle": 0,
        "postoints": 65411,
        "underlinePosition": 50,
        "underlineThickness": 0,
        "isFixedPitch": 0,
        "minMemType42": 0,
        "maxMemType42": 0,
        "minMemType1": 0,
        "maxMemType1": 1,
        "format": 2
    },
    "maxp": {
        "version": 1.0,
        "numGlyphs": 0,
        "maxPoints": 0,
        "maxContours": 0,
        "maxCompositePoints": 0,
        "maxCompositeContours": 0,
        "maxZones": 0,
        "maxTwilightPoints": 0,
        "maxStorage": 0,
        "maxFunctionDefs": 0,
        "maxStackElements": 0,
        "maxSizeOfInstructions": 0,
        "maxComponentElements": 0,
        "maxComponentDepth": 0
    },
    "OS/2": {
        "version": 4,
        "xAvgCharWidth": 1031,
        "usWeightClass": 400,
        "usWidthClass": 5,
        "fsType": 0,
        "ySubscriptXSize": 665,
        "ySubscriptYSize": 716,
        "ySubscriptXOffset": 0,
        "ySubscriptYOffset": 143,
        "ySuperscriptXSize": 665,
        "ySuperscriptYSize": 716,
        "ySuperscriptXOffset": 0,
        "ySuperscriptYOffset": 491,
        "yStrikeoutSize": 51,
        "yStrikeoutPosition": 265,
        "sFamilyClass": 0,
        "bFamilyType": 2,
        "bSerifStyle": 0,
        "bWeight": 6,
        "bProportion": 3,
        "bContrast": 0,
        "bStrokeVariation": 0,
        "bArmStyle": 0,
        "bLetterform": 0,
        "bMidline": 0,
        "bXHeight": 0,
        "ulUnicodeRange1": 1,
        "ulUnicodeRange2": 268435456,
        "ulUnicodeRange3": 0,
        "ulUnicodeRange4": 0,
        "achVendID": "PfEd",
        "fsSelection": 192,
        "usFirstCharIndex": 65535,
        "usLastCharIndex": -1,
        "sTypoAscender": 812,
        "sTypoDescender": -212,
        "sTypoLineGap": 92,
        "usWinAscent": 812,
        "usWinDescent": 212,
        "ulCodePageRange1": 1,
        "ulCodePageRange2": 0,
        "sxHeight": 792,
        "sCapHeight": 0,
        "usDefaultChar": 0,
        "usBreakChar": 32,
        "usMaxContext": 1
    }
};

/**
 * @file 默认的ttf字体配置
 * @author mengke01(kekee000@gmail.com)
 */

var config = {
    // 默认的字体编码
    fontId: 'fonteditor',

    // 默认的名字集合
    name: {
        // 默认的字体家族
        fontFamily: 'fonteditor',
        fontSubFamily: 'Medium',
        uniqueSubFamily: 'FontEditor 1.0 : fonteditor',
        version: 'Version 1.0; FontEditor (v1.0)',
        postScriptName: 'fonteditor'
    }
};

/**
 * @file 获取空的ttf对象
 * @author mengke01(kekee000@gmail.com)
 */


function getEmpty() {
    const ttf = clone(emptyttf);
    Object.assign(ttf.name, config.name);
    ttf.head.created = ttf.head.modified = Date.now();
    return ttf;
}

/**
 * @file unicode 编码与postName对照表
 * @author mengke01(kekee000@gmail.com)
 *
 * see:
 * http://www.microsoft.com/typography/otspec/WGL4.htm
 */

var unicodeName = {
    0: 1,
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 1,
    7: 1,
    8: 1,
    9: 2,
    10: 1,
    11: 1,
    12: 1,
    13: 2,
    14: 1,
    15: 1,
    16: 1,
    17: 1,
    18: 1,
    19: 1,
    20: 1,
    21: 1,
    22: 1,
    23: 1,
    24: 1,
    25: 1,
    26: 1,
    27: 1,
    28: 1,
    29: 1,
    30: 1,
    31: 1,
    32: 3,
    33: 4,
    34: 5,
    35: 6,
    36: 7,
    37: 8,
    38: 9,
    39: 10,
    40: 11,
    41: 12,
    42: 13,
    43: 14,
    44: 15,
    45: 16,
    46: 17,
    47: 18,
    48: 19,
    49: 20,
    50: 21,
    51: 22,
    52: 23,
    53: 24,
    54: 25,
    55: 26,
    56: 27,
    57: 28,
    58: 29,
    59: 30,
    60: 31,
    61: 32,
    62: 33,
    63: 34,
    64: 35,
    65: 36,
    66: 37,
    67: 38,
    68: 39,
    69: 40,
    70: 41,
    71: 42,
    72: 43,
    73: 44,
    74: 45,
    75: 46,
    76: 47,
    77: 48,
    78: 49,
    79: 50,
    80: 51,
    81: 52,
    82: 53,
    83: 54,
    84: 55,
    85: 56,
    86: 57,
    87: 58,
    88: 59,
    89: 60,
    90: 61,
    91: 62,
    92: 63,
    93: 64,
    94: 65,
    95: 66,
    96: 67,
    97: 68,
    98: 69,
    99: 70,
    100: 71,
    101: 72,
    102: 73,
    103: 74,
    104: 75,
    105: 76,
    106: 77,
    107: 78,
    108: 79,
    109: 80,
    110: 81,
    111: 82,
    112: 83,
    113: 84,
    114: 85,
    115: 86,
    116: 87,
    117: 88,
    118: 89,
    119: 90,
    120: 91,
    121: 92,
    122: 93,
    123: 94,
    124: 95,
    125: 96,
    126: 97,
    160: 172,
    161: 163,
    162: 132,
    163: 133,
    164: 189,
    165: 150,
    166: 232,
    167: 134,
    168: 142,
    169: 139,
    170: 157,
    171: 169,
    172: 164,
    174: 138,
    175: 218,
    176: 131,
    177: 147,
    178: 242,
    179: 243,
    180: 141,
    181: 151,
    182: 136,
    184: 222,
    185: 241,
    186: 158,
    187: 170,
    188: 245,
    189: 244,
    190: 246,
    191: 162,
    192: 173,
    193: 201,
    194: 199,
    195: 174,
    196: 98,
    197: 99,
    198: 144,
    199: 100,
    200: 203,
    201: 101,
    202: 200,
    203: 202,
    204: 207,
    205: 204,
    206: 205,
    207: 206,
    208: 233,
    209: 102,
    210: 211,
    211: 208,
    212: 209,
    213: 175,
    214: 103,
    215: 240,
    216: 145,
    217: 214,
    218: 212,
    219: 213,
    220: 104,
    221: 235,
    222: 237,
    223: 137,
    224: 106,
    225: 105,
    226: 107,
    227: 109,
    228: 108,
    229: 110,
    230: 160,
    231: 111,
    232: 113,
    233: 112,
    234: 114,
    235: 115,
    236: 117,
    237: 116,
    238: 118,
    239: 119,
    240: 234,
    241: 120,
    242: 122,
    243: 121,
    244: 123,
    245: 125,
    246: 124,
    247: 184,
    248: 161,
    249: 127,
    250: 126,
    251: 128,
    252: 129,
    253: 236,
    254: 238,
    255: 186,
    262: 253,
    263: 254,
    268: 255,
    269: 256,
    273: 257,
    286: 248,
    287: 249,
    304: 250,
    305: 215,
    321: 226,
    322: 227,
    338: 176,
    339: 177,
    350: 251,
    351: 252,
    352: 228,
    353: 229,
    376: 187,
    381: 230,
    382: 231,
    402: 166,
    710: 216,
    711: 225,
    728: 219,
    729: 220,
    730: 221,
    731: 224,
    733: 223,
    960: 155,
    8211: 178,
    8212: 179,
    8216: 182,
    8217: 183,
    8218: 196,
    8220: 180,
    8221: 181,
    8222: 197,
    8224: 130,
    8225: 194,
    8226: 135,
    8230: 171,
    8240: 198,
    8249: 190,
    8250: 191,
    8355: 247,
    8482: 140,
    8486: 159,
    8706: 152,
    8710: 168,
    8719: 154,
    8721: 153,
    8722: 239,
    8725: 188,
    8729: 195,
    8730: 165,
    8734: 146,
    8747: 156,
    8776: 167,
    8800: 143,
    8804: 148,
    8805: 149,
    9674: 185,
    61441: 192,
    61442: 193,
    64257: 192,
    64258: 193,
    65535: 0 // 0xFFFF指向.notdef
};

/**
 * @file Mac glyf命名表
 * @author mengke01(kekee000@gmail.com)
 *
 * see:
 * http://www.microsoft.com/typography/otspec/WGL4.htm
 */

var postName = {
    0: '.notdef',
    1: '.null',
    2: 'nonmarkingreturn',
    3: 'space',
    4: 'exclam',
    5: 'quotedbl',
    6: 'numbersign',
    7: 'dollar',
    8: 'percent',
    9: 'ampersand',
    10: 'quotesingle',
    11: 'parenleft',
    12: 'parenright',
    13: 'asterisk',
    14: 'plus',
    15: 'comma',
    16: 'hyphen',
    17: 'period',
    18: 'slash',
    19: 'zero',
    20: 'one',
    21: 'two',
    22: 'three',
    23: 'four',
    24: 'five',
    25: 'six',
    26: 'seven',
    27: 'eight',
    28: 'nine',
    29: 'colon',
    30: 'semicolon',
    31: 'less',
    32: 'equal',
    33: 'greater',
    34: 'question',
    35: 'at',
    36: 'A',
    37: 'B',
    38: 'C',
    39: 'D',
    40: 'E',
    41: 'F',
    42: 'G',
    43: 'H',
    44: 'I',
    45: 'J',
    46: 'K',
    47: 'L',
    48: 'M',
    49: 'N',
    50: 'O',
    51: 'P',
    52: 'Q',
    53: 'R',
    54: 'S',
    55: 'T',
    56: 'U',
    57: 'V',
    58: 'W',
    59: 'X',
    60: 'Y',
    61: 'Z',
    62: 'bracketleft',
    63: 'backslash',
    64: 'bracketright',
    65: 'asciicircum',
    66: 'underscore',
    67: 'grave',
    68: 'a',
    69: 'b',
    70: 'c',
    71: 'd',
    72: 'e',
    73: 'f',
    74: 'g',
    75: 'h',
    76: 'i',
    77: 'j',
    78: 'k',
    79: 'l',
    80: 'm',
    81: 'n',
    82: 'o',
    83: 'p',
    84: 'q',
    85: 'r',
    86: 's',
    87: 't',
    88: 'u',
    89: 'v',
    90: 'w',
    91: 'x',
    92: 'y',
    93: 'z',
    94: 'braceleft',
    95: 'bar',
    96: 'braceright',
    97: 'asciitilde',
    98: 'Adieresis',
    99: 'Aring',
    100: 'Ccedilla',
    101: 'Eacute',
    102: 'Ntilde',
    103: 'Odieresis',
    104: 'Udieresis',
    105: 'aacute',
    106: 'agrave',
    107: 'acircumflex',
    108: 'adieresis',
    109: 'atilde',
    110: 'aring',
    111: 'ccedilla',
    112: 'eacute',
    113: 'egrave',
    114: 'ecircumflex',
    115: 'edieresis',
    116: 'iacute',
    117: 'igrave',
    118: 'icircumflex',
    119: 'idieresis',
    120: 'ntilde',
    121: 'oacute',
    122: 'ograve',
    123: 'ocircumflex',
    124: 'odieresis',
    125: 'otilde',
    126: 'uacute',
    127: 'ugrave',
    128: 'ucircumflex',
    129: 'udieresis',
    130: 'dagger',
    131: 'degree',
    132: 'cent',
    133: 'sterling',
    134: 'section',
    135: 'bullet',
    136: 'paragraph',
    137: 'germandbls',
    138: 'registered',
    139: 'copyright',
    140: 'trademark',
    141: 'acute',
    142: 'dieresis',
    143: 'notequal',
    144: 'AE',
    145: 'Oslash',
    146: 'infinity',
    147: 'plusminus',
    148: 'lessequal',
    149: 'greaterequal',
    150: 'yen',
    151: 'mu',
    152: 'partialdiff',
    153: 'summation',
    154: 'product',
    155: 'pi',
    156: 'integral',
    157: 'ordfeminine',
    158: 'ordmasculine',
    159: 'Omega',
    160: 'ae',
    161: 'oslash',
    162: 'questiondown',
    163: 'exclamdown',
    164: 'logicalnot',
    165: 'radical',
    166: 'florin',
    167: 'approxequal',
    168: 'Delta',
    169: 'guillemotleft',
    170: 'guillemotright',
    171: 'ellipsis',
    172: 'nonbreakingspace',
    173: 'Agrave',
    174: 'Atilde',
    175: 'Otilde',
    176: 'OE',
    177: 'oe',
    178: 'endash',
    179: 'emdash',
    180: 'quotedblleft',
    181: 'quotedblright',
    182: 'quoteleft',
    183: 'quoteright',
    184: 'divide',
    185: 'lozenge',
    186: 'ydieresis',
    187: 'Ydieresis',
    188: 'fraction',
    189: 'currency',
    190: 'guilsinglleft',
    191: 'guilsinglright',
    192: 'fi',
    193: 'fl',
    194: 'daggerdbl',
    195: 'periodcentered',
    196: 'quotesinglbase',
    197: 'quotedblbase',
    198: 'perthousand',
    199: 'Acircumflex',
    200: 'Ecircumflex',
    201: 'Aacute',
    202: 'Edieresis',
    203: 'Egrave',
    204: 'Iacute',
    205: 'Icircumflex',
    206: 'Idieresis',
    207: 'Igrave',
    208: 'Oacute',
    209: 'Ocircumflex',
    210: 'apple',
    211: 'Ograve',
    212: 'Uacute',
    213: 'Ucircumflex',
    214: 'Ugrave',
    215: 'dotlessi',
    216: 'circumflex',
    217: 'tilde',
    218: 'macron',
    219: 'breve',
    220: 'dotaccent',
    221: 'ring',
    222: 'cedilla',
    223: 'hungarumlaut',
    224: 'ogonek',
    225: 'caron',
    226: 'Lslash',
    227: 'lslash',
    228: 'Scaron',
    229: 'scaron',
    230: 'Zcaron',
    231: 'zcaron',
    232: 'brokenbar',
    233: 'Eth',
    234: 'eth',
    235: 'Yacute',
    236: 'yacute',
    237: 'Thorn',
    238: 'thorn',
    239: 'minus',
    240: 'multiply',
    241: 'onesuperior',
    242: 'twosuperior',
    243: 'threesuperior',
    244: 'onehalf',
    245: 'onequarter',
    246: 'threequarters',
    247: 'franc',
    248: 'Gbreve',
    249: 'gbreve',
    250: 'Idotaccent',
    251: 'Scedilla',
    252: 'scedilla',
    253: 'Cacute',
    254: 'cacute',
    255: 'Ccaron',
    256: 'ccaron',
    257: 'dcroat'
};

/**
 * @file ttf字符串相关函数
 * @author mengke01(kekee000@gmail.com)
 *
 * references:
 * 1. svg2ttf @ github
 */

/**
 * 将unicode编码转换成js内部编码，
 * 有时候单子节的字符会编码成类似`\u0020`, 这里还原单字节
 *
 * @param {string} str str字符串
 * @return {string} 转换后字符串
 */
function stringify(str) {
    if (!str) {
        return str;
    }

    let newStr = '';
    for (let i = 0, l = str.length, ch; i < l; i++) {
        ch = str.charCodeAt(i);
        if (ch === 0) {
            continue;
        }
        newStr += String.fromCharCode(ch);
    }
    return newStr;
}

var utilString = {

    stringify,

    /**
     * 将双字节编码字符转换成`\uxxxx`形式
     *
     * @param {string} str str字符串
     * @return {string} 转换后字符串
     */
    escape(str) {
        if (!str) {
            return str;
        }
        return String(str).replace(/[\uff-\uffff]/g, c => escape(c).replace('%', '\\'));
    },

    /**
     * bytes to string
     *
     * @param  {Array} bytes 字节数组
     * @return {string}       string
     */
    getString(bytes) {
        let s = '';
        for (let i = 0, l = bytes.length; i < l; i++) {
            s += String.fromCharCode(bytes[i]);
        }
        return s;
    },

    /**
     * 获取unicode的名字值
     *
     * @param {number} unicode unicode
     * @return {string} 名字
     */
    getUnicodeName(unicode) {
        const unicodeNameIndex = unicodeName[unicode];
        if (undefined !== unicodeNameIndex) {
            return postName[unicodeNameIndex];
        }

        return 'uni' + unicode.toString(16).toUpperCase();
    },

    /**
     * 转换成utf8的字节数组
     *
     * @param {string} str 字符串
     * @return {Array.<byte>} 字节数组
     */
    toUTF8Bytes(str) {
        str = stringify(str);
        const byteArray = [];
        for (let i = 0, l = str.length; i < l; i++) {
            if (str.charCodeAt(i) <= 0x7F) {
                byteArray.push(str.charCodeAt(i));
            }
            else {
                const codePoint = str.codePointAt(i);
                if (codePoint > 0xffff) {
                    i++;
                }
                const h = encodeURIComponent(String.fromCodePoint(codePoint)).slice(1).split('%');
                for (let j = 0; j < h.length; j++) {
                    byteArray.push(parseInt(h[j], 16));
                }
            }
        }
        return byteArray;
    },

    /**
     * 转换成usc2的字节数组
     *
     * @param {string} str 字符串
     * @return {Array.<byte>} 字节数组
     */
    toUCS2Bytes(str) {
        str = stringify(str);
        const byteArray = [];

        for (let i = 0, l = str.length, ch; i < l; i++) {
            ch = str.charCodeAt(i);
            byteArray.push(ch >> 8);
            byteArray.push(ch & 0xFF);
        }

        return byteArray;
    },


    /**
     * 获取pascal string 字节数组
     *
     * @param {string} str 字符串
     * @return {Array.<byte>} byteArray byte数组
     */
    toPascalStringBytes(str) {
        const bytes = [];
        const length = str ? (str.length < 256 ? str.length : 255) : 0;
        bytes.push(length);

        for (let i = 0, l = str.length; i < l; i++) {
            const c = str.charCodeAt(i);
            // non-ASCII characters are substituted with '*'
            bytes.push(c < 128 ? c : 42);
        }

        return bytes;
    },

    /**
     * utf8字节转字符串
     *
     * @param {Array} bytes 字节
     * @return {string} 字符串
     */
    getUTF8String(bytes) {
        let str = '';
        for (let i = 0, l = bytes.length; i < l; i++) {
            if (bytes[i] < 0x7F) {
                str += String.fromCharCode(bytes[i]);
            }
            else {
                str += '%' + (256 + bytes[i]).toString(16).slice(1);
            }
        }

        return unescape(str);
    },

    /**
     * ucs2字节转字符串
     *
     * @param {Array} bytes 字节
     * @return {string} 字符串
     */
    getUCS2String(bytes) {
        let str = '';
        for (let i = 0, l = bytes.length; i < l; i += 2) {
            str += String.fromCharCode((bytes[i] << 8) + bytes[i + 1]);
        }
        return str;
    },

    /**
     * 读取 pascal string
     *
     * @param {Array.<byte>} byteArray byte数组
     * @return {Array.<string>} 读取后的字符串数组
     */
    getPascalString(byteArray) {
        const strArray = [];
        let i = 0;
        const l = byteArray.length;

        while (i < l) {
            let strLength = byteArray[i++];
            let str = '';

            while (strLength-- > 0 && i < l) {
                str += String.fromCharCode(byteArray[i++]);
            }
            // 这里需要将unicode转换成js编码
            str = stringify(str);
            strArray.push(str);
        }

        return strArray;
    }
};

/**
 * @file 调整路径缩放和平移
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 对path坐标进行调整
 *
 * @param {Object} contour 坐标点
 * @param {number} scaleX x缩放比例
 * @param {number} scaleY y缩放比例
 * @param {number} offsetX x偏移
 * @param {number} offsetY y偏移
 *
 * @return {Object} contour 坐标点
 */
function pathAdjust(contour, scaleX, scaleY, offsetX, offsetY) {
    scaleX = scaleX === undefined ? 1 : scaleX;
    scaleY = scaleY === undefined ? 1 : scaleY;
    const x = offsetX || 0;
    const y = offsetY || 0;
    let p;
    for (let i = 0, l = contour.length; i < l; i++) {
        p = contour[i];
        p.x = scaleX * (p.x + x);
        p.y = scaleY * (p.y + y);
    }
    return contour;
}

/**
 * @file 对路径进行四舍五入
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 对path坐标进行调整
 *
 * @param {Array} contour 轮廓点数组
 * @param {number} point 四舍五入的点数
 * @return {Object} contour 坐标点
 */
function pathCeil(contour, point) {
    let p;
    for (let i = 0, l = contour.length; i < l; i++) {
        p = contour[i];
        if (!point) {
            p.x = Math.round(p.x);
            p.y = Math.round(p.y);
        }
        else {
            p.x = Number(p.x.toFixed(point));
            p.y = Number(p.y.toFixed(point));
        }
    }
    return contour;
}

/**
 * @file 遍历路径的路径集合，包括segment和 bezier curve
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 遍历路径的路径集合
 *
 * @param {Array} contour 坐标点集
 * @param {Function} callBack 回调函数，参数集合：command, p0, p1, p2, i
 * p0, p1, p2 直线或者贝塞尔曲线参数
 * i 当前遍历的点
 * 其中command = L 或者 Q，表示直线或者贝塞尔曲线
 */
function pathIterator(contour, callBack) {

    let curPoint;
    let prevPoint;
    let nextPoint;
    let cursorPoint; // cursorPoint 为当前单个绘制命令的起点

    for (let i = 0, l = contour.length; i < l; i++) {
        curPoint = contour[i];
        prevPoint = i === 0 ? contour[l - 1] : contour[i - 1];
        nextPoint = i === l - 1 ? contour[0] : contour[i + 1];

        // 起始坐标
        if (i === 0) {
            if (curPoint.onCurve) {
                cursorPoint = curPoint;
            }
            else if (prevPoint.onCurve) {
                cursorPoint = prevPoint;
            }
            else {
                cursorPoint = {
                    x: (prevPoint.x + curPoint.x) / 2,
                    y: (prevPoint.y + curPoint.y) / 2
                };
            }

        }

        // 直线
        if (curPoint.onCurve && nextPoint.onCurve) {
            if (false === callBack('L', curPoint, nextPoint, 0, i)) {
                break;
            }
            cursorPoint = nextPoint;
        }
        else if (!curPoint.onCurve) {

            if (nextPoint.onCurve) {
                if (false === callBack('Q', cursorPoint, curPoint, nextPoint, i)) {
                    break;
                }
                cursorPoint = nextPoint;
            }
            else {
                const last = {
                    x: (curPoint.x + nextPoint.x) / 2,
                    y: (curPoint.y + nextPoint.y) / 2
                };
                if (false === callBack('Q', cursorPoint, curPoint, last, i)) {
                    break;
                }
                cursorPoint = last;
            }
        }
    }
}

/**
 * @file 计算曲线包围盒
 * @author mengke01(kekee000@gmail.com)
 *
 * modify from:
 * zrender
 * https://github.com/ecomfe/zrender/blob/master/src/tool/computeBoundingBox.js
 */

/**
 * 计算包围盒
 *
 * @param {Array} points 点集
 * @return {Object} bounding box
 */
function computeBoundingBox(points) {

    if (points.length === 0) {
        return false;
    }

    let left = points[0].x;
    let right = points[0].x;
    let top = points[0].y;
    let bottom = points[0].y;

    for (let i = 1; i < points.length; i++) {
        const p = points[i];

        if (p.x < left) {
            left = p.x;
        }

        if (p.x > right) {
            right = p.x;
        }

        if (p.y < top) {
            top = p.y;
        }

        if (p.y > bottom) {
            bottom = p.y;
        }
    }

    return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top
    };
}

/**
 * 计算二阶贝塞尔曲线的包围盒
 * http://pissang.net/blog/?p=91
 *
 * @param {Object} p0 p0
 * @param {Object} p1 p1
 * @param {Object} p2 p2
 * @return {Object} bound对象
 */
function computeQuadraticBezierBoundingBox(p0, p1, p2) {
    // Find extremities, where derivative in x dim or y dim is zero
    let tmp = (p0.x + p2.x - 2 * p1.x);
    // p1 is center of p0 and p2 in x dim
    let t1;
    if (tmp === 0) {
        t1 = 0.5;
    }
    else {
        t1 = (p0.x - p1.x) / tmp;
    }

    tmp = (p0.y + p2.y - 2 * p1.y);
    // p1 is center of p0 and p2 in y dim
    let t2;
    if (tmp === 0) {
        t2 = 0.5;
    }
    else {
        t2 = (p0.y - p1.y) / tmp;
    }

    t1 = Math.max(Math.min(t1, 1), 0);
    t2 = Math.max(Math.min(t2, 1), 0);

    const ct1 = 1 - t1;
    const ct2 = 1 - t2;

    const x1 = ct1 * ct1 * p0.x + 2 * ct1 * t1 * p1.x + t1 * t1 * p2.x;
    const y1 = ct1 * ct1 * p0.y + 2 * ct1 * t1 * p1.y + t1 * t1 * p2.y;

    const x2 = ct2 * ct2 * p0.x + 2 * ct2 * t2 * p1.x + t2 * t2 * p2.x;
    const y2 = ct2 * ct2 * p0.y + 2 * ct2 * t2 * p1.y + t2 * t2 * p2.y;

    return computeBoundingBox(
        [
            p0,
            p2,
            {
                x: x1,
                y: y1
            },
            {
                x: x2,
                y: y2
            }
        ]
    );
}

/**
 * 计算曲线包围盒
 *
 * @private
 * @param {...Array} args 坐标点集, 支持多个path
 * @return {Object} {x, y, width, height}
 */
function computePathBoundingBox(...args) {

    const points = [];
    const iterator = function (c, p0, p1, p2) {
        if (c === 'L') {
            points.push(p0);
            points.push(p1);
        }
        else if (c === 'Q') {
            const bound = computeQuadraticBezierBoundingBox(p0, p1, p2);

            points.push(bound);
            points.push({
                x: bound.x + bound.width,
                y: bound.y + bound.height
            });
        }
    };

    if (args.length === 1) {
        pathIterator(args[0], (c, p0, p1, p2) => {
            if (c === 'L') {
                points.push(p0);
                points.push(p1);
            }
            else if (c === 'Q') {
                const bound = computeQuadraticBezierBoundingBox(p0, p1, p2);

                points.push(bound);
                points.push({
                    x: bound.x + bound.width,
                    y: bound.y + bound.height
                });
            }
        });
    }
    else {
        for (let i = 0, l = args.length; i < l; i++) {
            pathIterator(args[i], iterator);
        }
    }

    return computeBoundingBox(points);
}


/**
 * 计算曲线点边界
 *
 * @private
 * @param {...Array} args path对象, 支持多个path
 * @return {Object} {x, y, width, height}
 */
function computePathBox(...args) {
    let points = [];
    if (args.length === 1) {
        points = args[0];
    }
    else {
        for (let i = 0, l = args.length; i < l; i++) {
            Array.prototype.splice.apply(points, [points.length, 0].concat(args[i]));
        }
    }
    return computeBoundingBox(points);
}
const computePath = computePathBoundingBox;

/**
 * @file 对轮廓进行transform变换
 * @author mengke01(kekee000@gmail.com)
 *
 * 参考资料：
 * http://blog.csdn.net/henren555/article/details/9699449
 *
 *  |X|    |a      c       e|    |x|
 *  |Y| =  |b      d       f| *  |y|
 *  |1|    |0      0       1|    |1|
 *
 *  X = x * a + y * c + e
 *  Y = x * b + y * d + f
 */

/**
 * 图形仿射矩阵变换
 *
 * @param {Array.<Object>} contour 轮廓点
 * @param {number} a m11
 * @param {number} b m12
 * @param {number} c m21
 * @param {number} d m22
 * @param {number} e dx
 * @param {number} f dy
 * @return {Array.<Object>} contour 轮廓点
 */
function transform(contour, a, b, c, d, e, f) {
    let x;
    let y;
    let p;
    for (let i = 0, l = contour.length; i < l; i++) {
        p = contour[i];
        x = p.x;
        y = p.y;
        p.x = x * a + y * c + e;
        p.y = x * b + y * d + f;
    }
    return contour;
}

/**
 * @file 转换复合字形的contours，以便于显示
 * @author mengke01(kekee000@gmail.com)
 */


/**
 * 转换复合字形轮廓，结果保存在contoursList中，并返回当前glyf的轮廓
 *
 * @param  {Object} glyf glyf对象
 * @param  {Object} ttf ttfObject对象
 * @param  {Object=} contoursList 保存转换中间生成的contours
 * @param  {number} glyfIndex glyf对象当前的index
 * @return {Array} 转换后的轮廓
 */
function transformGlyfContours(glyf, ttf, contoursList = {}, glyfIndex) {

    if (!glyf.glyfs) {
        return glyf;
    }

    const compoundContours = [];
    glyf.glyfs.forEach(g => {
        const glyph = ttf.glyf[g.glyphIndex];

        if (!glyph || glyph === glyf) {
            return;
        }

        // 递归转换contours
        if (glyph.compound && !contoursList[g.glyphIndex]) {
            transformGlyfContours(glyph, ttf, contoursList, g.glyphIndex);
        }

        // 这里需要进行matrix变换，需要复制一份
        const contours = clone(glyph.compound ? (contoursList[g.glyphIndex] || []) : glyph.contours);
        const transform$1 = g.transform;
        for (let i = 0, l = contours.length; i < l; i++) {
            transform(
                contours[i],
                transform$1.a,
                transform$1.b,
                transform$1.c,
                transform$1.d,
                transform$1.e,
                transform$1.f
            );
            compoundContours.push(pathCeil(contours[i]));
        }
    });

    // eslint-disable-next-line eqeqeq
    if (null != glyfIndex) {
        contoursList[glyfIndex] = compoundContours;
    }

    return compoundContours;
}

/**
 * @file 复合字形设置轮廓，转化为简单字形
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 复合字形转简单字形
 *
 * @param  {Object} glyf glyf对象
 * @param  {Array} contours 轮廓数组
 * @return {Object} 转换后对象
 */
function compound2simple(glyf, contours) {
    glyf.contours = contours;
    delete glyf.compound;
    delete glyf.glyfs;
    // 这里hinting信息会失效，删除hinting信息
    delete glyf.instructions;
    return glyf;
}

/**
 * @file ttf复合字形转简单字形
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * ttf复合字形转简单字形
 *
 * @param  {Object|number} glyf glyf对象或者glyf索引
 * @param  {Object} ttf ttfObject对象
 * @param  {boolean} recrusive 是否递归的进行转换，如果复合字形为嵌套字形，则转换每一个复合字形
 * @return {Object} 转换后的对象
 */
function compound2simpleglyf(glyf, ttf, recrusive) {

    let glyfIndex;
    // 兼容索引和对象传入
    if (typeof glyf === 'number') {
        glyfIndex = glyf;
        glyf = ttf.glyf[glyfIndex];
    }
    else {
        glyfIndex = ttf.glyf.indexOf(glyf);
        if (-1 === glyfIndex) {
            return glyf;
        }
    }

    if (!glyf.compound || !glyf.glyfs) {
        return glyf;
    }

    const contoursList = {};
    transformGlyfContours(glyf, ttf, contoursList, glyfIndex);

    if (recrusive) {
        Object.keys(contoursList).forEach((index) => {
            compound2simple(ttf.glyf[index], contoursList[index]);
        });
    }
    else {
        compound2simple(glyf, contoursList[glyfIndex]);
    }

    return glyf;
}

/**
 * @file glyf的缩放和平移调整
 * @author mengke01(kekee000@gmail.com)
 */


/**
 * 简单字形的缩放和平移调整
 *
 * @param {Object} g glyf对象
 * @param {number} scaleX x缩放比例
 * @param {number} scaleY y缩放比例
 * @param {number} offsetX x偏移
 * @param {number} offsetY y偏移
 * @param {boolan} useCeil 是否对字形设置取整，默认取整
 *
 * @return {Object} 调整后的glyf对象
 */
function glyfAdjust(g, scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0, useCeil = true) {

    if (g.contours && g.contours.length) {
        if (scaleX !== 1 || scaleY !== 1) {
            g.contours.forEach((contour) => {
                pathAdjust(contour, scaleX, scaleY);
            });
        }

        if (offsetX !== 0 || offsetY !== 0) {
            g.contours.forEach((contour) => {
                pathAdjust(contour, 1, 1, offsetX, offsetY);
            });
        }

        if (false !== useCeil) {
            g.contours.forEach((contour) => {
                pathCeil(contour);
            });
        }
    }

    // 重新计算xmin，xmax，ymin，ymax
    const advanceWidth = g.advanceWidth;
    if (
        undefined === g.xMin
        || undefined === g.yMax
        || undefined === g.leftSideBearing
        || undefined === g.advanceWidth
    ) {
        // 有的字形没有形状，需要特殊处理一下
        let bound;
        if (g.contours && g.contours.length) {
            // eslint-disable-next-line no-invalid-this
            bound = computePathBox.apply(this, g.contours);
        }
        else {
            bound = {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };
        }

        g.xMin = bound.x;
        g.xMax = bound.x + bound.width;
        g.yMin = bound.y;
        g.yMax = bound.y + bound.height;

        g.leftSideBearing = g.xMin;

        // 如果设置了advanceWidth就是用默认的，否则为xMax + abs(xMin)
        if (undefined !== advanceWidth) {
            g.advanceWidth = Math.round(advanceWidth * scaleX + offsetX);
        }
        else {
            g.advanceWidth = g.xMax + Math.abs(g.xMin);
        }
    }
    else {
        g.xMin = Math.round(g.xMin * scaleX + offsetX);
        g.xMax = Math.round(g.xMax * scaleX + offsetX);
        g.yMin = Math.round(g.yMin * scaleY + offsetY);
        g.yMax = Math.round(g.yMax * scaleY + offsetY);
        g.leftSideBearing = Math.round(g.leftSideBearing * scaleX + offsetX);
        g.advanceWidth = Math.round(advanceWidth * scaleX + offsetX);
    }

    return g;
}

/**
 * @file 缩减path大小，去除冗余节点
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 判断点是否多余的点
 *
 * @param {Object} prev 上一个
 * @param {Object} p 当前
 * @param {Object} next 下一个
 * @return {boolean}
 */
function redundant(prev, p, next) {

    // 是否重合的点, 只有两个点同在曲线上或者同不在曲线上移出
    if (
        (p.onCurve && next.onCurve || !p.onCurve && !next.onCurve)
        && Math.pow(p.x - next.x, 2) + Math.pow(p.y - next.y, 2) <= 1
    ) {
        return true;
    }

    // 三点同线 检查直线点
    if (
        (p.onCurve && prev.onCurve && next.onCurve)
        && Math.abs((next.y - p.y) * (prev.x - p.x) - (prev.y - p.y) * (next.x - p.x)) <= 0.001
    ) {
        return true;
    }

    // 三点同线 检查控制点
    if (
        (!p.onCurve && prev.onCurve && next.onCurve)
        && Math.abs((next.y - p.y) * (prev.x - p.x) - (prev.y - p.y) * (next.x - p.x)) <= 0.001
    ) {
        return true;
    }

    return false;
}

/**
 * 缩减glyf，去除冗余节点
 *
 * @param {Array} contour 路径对象
 * @return {Array} 路径对象
 */
function reducePath(contour) {

    if (!contour.length) {
        return contour;
    }

    let prev;
    let next;
    let p;
    for (let i = contour.length - 1, last = i; i >= 0; i--) {

        // 这里注意逆序
        p = contour[i];
        next = i === last ? contour[0] : contour[i + 1];
        prev = i === 0 ? contour[last] : contour[i - 1];

        if (redundant(prev, p, next)) {
            contour.splice(i, 1);
            last--;
            continue;
        }
    }

    return contour;
}

/**
 * @file 缩减glyf大小，去除冗余节点
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 缩减glyf，去除冗余节点
 *
 * @param {Object} glyf glyf对象
 * @return {Object} glyf对象
 */
function reduceGlyf(glyf) {

    const contours = glyf.contours;
    let contour;
    for (let j = contours.length - 1; j >= 0; j--) {
        contour = reducePath(contours[j]);

        // 空轮廓
        if (contour.length <= 2) {
            contours.splice(j, 1);
            continue;
        }
    }

    if (0 === glyf.contours.length) {
        delete glyf.contours;
    }

    return glyf;
}

/**
 * @file 对ttf对象进行优化，查找错误，去除冗余点
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 对ttf对象进行优化
 *
 * @param  {Object} ttf ttf对象
 * @return {true|Object} 错误信息
 */
function optimizettf(ttf) {

    const checkUnicodeRepeat = {}; // 检查是否有重复代码点
    const repeatList = [];

    ttf.glyf.forEach((glyf, index) => {
        if (glyf.unicode) {
            glyf.unicode = glyf.unicode.sort();

            // 将glyf的代码点按小到大排序
            glyf.unicode.sort((a, b) => a - b).forEach((u) => {
                if (checkUnicodeRepeat[u]) {
                    repeatList.push(index);
                }
                else {
                    checkUnicodeRepeat[u] = true;
                }
            });

        }

        if (!glyf.compound && glyf.contours) {
            // 整数化
            glyf.contours.forEach((contour) => {
                pathCeil(contour);
            });
            // 缩减glyf
            reduceGlyf(glyf);
        }

        // 整数化
        glyf.xMin = Math.round(glyf.xMin || 0);
        glyf.xMax = Math.round(glyf.xMax || 0);
        glyf.yMin = Math.round(glyf.yMin || 0);
        glyf.yMax = Math.round(glyf.yMax || 0);
        glyf.leftSideBearing = Math.round(glyf.leftSideBearing || 0);
        glyf.advanceWidth = Math.round(glyf.advanceWidth || 0);
    });

    // 过滤无轮廓字体，如果存在复合字形不进行过滤
    if (!ttf.glyf.some((a) => a.compound)) {
        ttf.glyf = ttf.glyf.filter((glyf, index) => index === 0 || glyf.contours && glyf.contours.length);
    }

    if (!repeatList.length) {
        return true;
    }

    return {
        repeat: repeatList
    };
}

/**
 * @file ttf相关处理对象
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 缩放到EM框
 *
 * @param {Array} glyfList glyf列表
 * @param {number} ascent 上升
 * @param {number} descent 下降
 * @param {number} ajdustToEmPadding  顶部和底部留白
 * @return {Array} glyfList
 */
function adjustToEmBox(glyfList, ascent, descent, ajdustToEmPadding) {

    glyfList.forEach((g) => {

        if (g.contours && g.contours.length) {
            const rightSideBearing = g.advanceWidth - g.xMax;
            const bound = computePath(...g.contours);
            const scale = (ascent - descent - ajdustToEmPadding) / bound.height;
            const center = (ascent + descent) / 2;
            const yOffset = center - (bound.y + bound.height / 2) * scale;

            g.contours.forEach((contour) => {
                if (scale !== 1) {
                    pathAdjust(contour, scale, scale);
                }

                pathAdjust(contour, 1, 1, 0, yOffset);
                pathCeil(contour);
            });

            const box = computePathBox(...g.contours);

            g.xMin = box.x;
            g.xMax = box.x + box.width;
            g.yMin = box.y;
            g.yMax = box.y + box.height;

            g.leftSideBearing = g.xMin;
            g.advanceWidth = g.xMax + rightSideBearing;

        }

    });

    return glyfList;
}

/**
 * 调整字形位置
 *
 * @param {Array} glyfList 字形列表
 * @param {number=} leftSideBearing 左边距
 * @param {number=} rightSideBearing 右边距
 * @param {number=} verticalAlign 垂直对齐
 *
 * @return {Array} 改变的列表
 */
function adjustPos(glyfList, leftSideBearing, rightSideBearing, verticalAlign) {

    let changed = false;

    // 左边轴
    if (null != leftSideBearing) {
        changed = true;

        glyfList.forEach((g) => {
            if (g.leftSideBearing !== leftSideBearing) {
                glyfAdjust(g, 1, 1, leftSideBearing - g.leftSideBearing);
            }
        });
    }

    // 右边轴
    if (null != rightSideBearing) {
        changed = true;

        glyfList.forEach((g) => {
            g.advanceWidth = g.xMax + rightSideBearing;
        });
    }

    // 基线高度
    if (null != verticalAlign) {
        changed = true;

        glyfList.forEach(g => {
            if (g.contours && g.contours.length) {
                const bound = computePath(...g.contours);
                const offset = verticalAlign - bound.y;
                glyfAdjust(g, 1, 1, 0, offset);
            }
        });
    }

    return changed ? glyfList : [];
}



/**
 * 合并两个ttfObject，此处仅合并简单字形
 *
 * @param {Object} ttf ttfObject
 * @param {Object} imported ttfObject
 * @param {Object} options 参数选项
 * @param {boolean} options.scale 是否自动缩放，默认true
 * @param {boolean} options.adjustGlyf 是否调整字形以适应边界
 *                                     (与 options.scale 互斥)
 *
 * @return {Object} 合并后的ttfObject
 */
function merge(ttf, imported, options = {scale: true}) {

    const list = imported.glyf.filter((g) =>
        // 简单轮廓
        g.contours && g.contours.length
            // 非预定义字形
            && g.name !== '.notdef' && g.name !== '.null' && g.name !== 'nonmarkingreturn'
    );

    // 调整字形以适应边界
    if (options.adjustGlyf) {
        const ascent = ttf.hhea.ascent;
        const descent = ttf.hhea.descent;
        const ajdustToEmPadding = 16;
        adjustPos(list, 16, 16);
        adjustToEmBox(list, ascent, descent, ajdustToEmPadding);

        list.forEach((g) => {
            ttf.glyf.push(g);
        });
    }
    // 根据unitsPerEm 进行缩放
    else if (options.scale) {

        let scale = 1;

        // 调整glyf对导入的轮廓进行缩放处理
        if (imported.head.unitsPerEm && imported.head.unitsPerEm !== ttf.head.unitsPerEm) {
            scale = ttf.head.unitsPerEm / imported.head.unitsPerEm;
        }

        list.forEach((g) => {
            glyfAdjust(g, scale, scale);
            ttf.glyf.push(g);
        });
    }

    return list;
}

class TTF {

    /**
     * ttf读取函数
     *
     * @constructor
     * @param {Object} ttf ttf文件结构
     */
    constructor(ttf) {
        this.ttf = ttf;
    }

    /**
     * 获取所有的字符信息
     *
     * @return {Object} 字符信息
     */
    codes() {
        return Object.keys(this.ttf.cmap);
    }

    /**
     * 根据编码获取字形索引
     *
     * @param {string} c 字符或者字符编码
     *
     * @return {?number} 返回glyf索引号
     */
    getGlyfIndexByCode(c) {
        const charCode = typeof c === 'number' ? c : c.codePointAt(0);
        const glyfIndex = this.ttf.cmap[charCode] || -1;
        return glyfIndex;
    }

    /**
     * 根据索引获取字形
     *
     * @param {number} glyfIndex glyf的索引
     *
     * @return {?Object} 返回glyf对象
     */
    getGlyfByIndex(glyfIndex) {
        const glyfList = this.ttf.glyf;
        const glyf = glyfList[glyfIndex];
        return glyf;
    }

    /**
     * 根据编码获取字形
     *
     * @param {string} c 字符或者字符编码
     *
     * @return {?Object} 返回glyf对象
     */
    getGlyfByCode(c) {
        const glyfIndex = this.getGlyfIndexByCode(c);
        return this.getGlyfByIndex(glyfIndex);
    }

    /**
     * 设置ttf对象
     *
     * @param {Object} ttf ttf对象
     * @return {this}
     */
    set(ttf) {
        this.ttf = ttf;
        return this;
    }

    /**
     * 获取ttf对象
     *
     * @return {ttfObject} ttf ttf对象
     */
    get() {
        return this.ttf;
    }

    /**
     * 添加glyf
     *
     * @param {Object} glyf glyf对象
     *
     * @return {number} 添加的glyf
     */
    addGlyf(glyf) {
        return this.insertGlyf(glyf);
    }

    /**
     * 插入glyf
     *
     * @param {Object} glyf glyf对象
     * @param {Object} insertIndex 插入的索引
     * @return {number} 添加的glyf
     */
    insertGlyf(glyf, insertIndex) {
        if (insertIndex >= 0 && insertIndex < this.ttf.glyf.length) {
            this.ttf.glyf.splice(insertIndex, 0, glyf);
        }
        else {
            this.ttf.glyf.push(glyf);
        }

        return [glyf];
    }

    /**
     * 合并两个ttfObject，此处仅合并简单字形
     *
     * @param {Object} imported ttfObject
     * @param {Object} options 参数选项
     * @param {boolean} options.scale 是否自动缩放
     * @param {boolean} options.adjustGlyf 是否调整字形以适应边界
     *                                     (和 options.scale 参数互斥)
     *
     * @return {Array} 添加的glyf
     */
    mergeGlyf(imported, options) {
        const list = merge(this.ttf, imported, options);
        return list;
    }


    /**
     * 删除指定字形
     *
     * @param {Array} indexList 索引列表
     * @return {Array} 删除的glyf
     */
    removeGlyf(indexList) {
        const glyf = this.ttf.glyf;
        const removed = [];
        for (let i = glyf.length - 1; i >= 0; i--) {
            if (indexList.indexOf(i) >= 0) {
                removed.push(glyf[i]);
                glyf.splice(i, 1);
            }
        }
        return removed;
    }


    /**
     * 设置unicode代码
     *
     * @param {string} unicode unicode代码 $E021, $22
     * @param {Array=} indexList 索引列表
     * @param {boolean} isGenerateName 是否生成name
     * @return {Array} 改变的glyf
     */
    setUnicode(unicode, indexList, isGenerateName) {
        const glyf = this.ttf.glyf;
        let list = [];
        if (indexList && indexList.length) {
            const first = indexList.indexOf(0);
            if (first >= 0) {
                indexList.splice(first, 1);
            }
            list = indexList.map((item) => glyf[item]);
        }
        else {
            list = glyf.slice(1);
        }

        // 需要选出 unicode >32 的glyf
        if (list.length > 1) {
            const less32 = function (u) {
                return u < 33;
            };
            list = list.filter((g) => !g.unicode || !g.unicode.some(less32));
        }

        if (list.length) {
            unicode = Number('0x' + unicode.slice(1));
            list.forEach((g) => {
                // 空格有可能会放入 nonmarkingreturn 因此不做编码
                if (unicode === 0xA0 || unicode === 0x3000) {
                    unicode++;
                }

                g.unicode = [unicode];

                if (isGenerateName) {
                    g.name = utilString.getUnicodeName(unicode);
                }
                unicode++;
            });
        }

        return list;
    }

    /**
     * 生成字形名称
     *
     * @param {Array=} indexList 索引列表
     * @return {Array} 改变的glyf
     */
    genGlyfName(indexList) {
        const glyf = this.ttf.glyf;
        let list = [];
        if (indexList && indexList.length) {
            list = indexList.map((item) => glyf[item]);
        }
        else {
            list = glyf;
        }

        if (list.length) {
            const first = this.ttf.glyf[0];

            list.forEach((g) => {
                if (g === first) {
                    g.name = '.notdef';
                }
                else if (g.unicode && g.unicode.length) {
                    g.name = utilString.getUnicodeName(g.unicode[0]);
                }
                else {
                    g.name = '.notdef';
                }
            });
        }

        return list;
    }

    /**
     * 清除字形名称
     *
     * @param {Array=} indexList 索引列表
     * @return {Array} 改变的glyf
     */
    clearGlyfName(indexList) {
        const glyf = this.ttf.glyf;
        let list = [];
        if (indexList && indexList.length) {
            list = indexList.map((item) => glyf[item]);
        }
        else {
            list = glyf;
        }

        if (list.length) {

            list.forEach((g) => {
                delete g.name;
            });
        }

        return list;
    }

    /**
     * 添加并体替换指定的glyf
     *
     * @param {Array} glyfList 添加的列表
     * @param {Array=} indexList 需要替换的索引列表
     * @return {Array} 改变的glyf
     */
    appendGlyf(glyfList, indexList) {
        const glyf = this.ttf.glyf;
        const result = glyfList.slice(0);

        if (indexList && indexList.length) {
            const l = Math.min(glyfList.length, indexList.length);
            for (let i = 0; i < l; i++) {
                glyf[indexList[i]] = glyfList[i];
            }
            glyfList = glyfList.slice(l);
        }

        if (glyfList.length) {
            Array.prototype.splice.apply(glyf, [glyf.length, 0, ...glyfList]);
        }

        return result;
    }


    /**
     * 调整glyf位置
     *
     * @param {Array=} indexList 索引列表
     * @param {Object} setting 选项
     * @param {number=} setting.leftSideBearing 左边距
     * @param {number=} setting.rightSideBearing 右边距
     * @param {number=} setting.verticalAlign 垂直对齐
     * @return {Array} 改变的glyf
     */
    adjustGlyfPos(indexList, setting) {

        const glyfList = this.getGlyf(indexList);
        return adjustPos(
            glyfList,
            setting.leftSideBearing,
            setting.rightSideBearing,
            setting.verticalAlign
        );
    }


    /**
     * 调整glyf
     *
     * @param {Array=} indexList 索引列表
     * @param {Object} setting 选项
     * @param {boolean=} setting.reverse 字形反转操作
     * @param {boolean=} setting.mirror 字形镜像操作
     * @param {number=} setting.scale 字形缩放
     * @param {boolean=} setting.ajdustToEmBox  是否调整字形到 em 框
     * @param {number=} setting.ajdustToEmPadding 调整到 em 框的留白
     * @return {boolean}
     */
    adjustGlyf(indexList, setting) {

        const glyfList = this.getGlyf(indexList);
        let changed = false;

        if (setting.reverse || setting.mirror) {

            changed = true;

            glyfList.forEach((g) => {
                if (g.contours && g.contours.length) {
                    const offsetX = g.xMax + g.xMin;
                    const offsetY = g.yMax + g.yMin;
                    g.contours.forEach((contour) => {
                        pathAdjust(contour, setting.mirror ? -1 : 1, setting.reverse ? -1 : 1);
                        pathAdjust(contour, 1, 1, setting.mirror ? offsetX : 0, setting.reverse ? offsetY : 0);
                    });
                }
            });
        }


        if (setting.scale && setting.scale !== 1) {

            changed = true;

            const scale = setting.scale;
            glyfList.forEach((g) => {
                if (g.contours && g.contours.length) {
                    glyfAdjust(g, scale, scale);
                }
            });
        }
        // 缩放到embox
        else if (setting.ajdustToEmBox) {

            changed = true;
            const ascent = this.ttf.hhea.ascent;
            const descent = this.ttf.hhea.descent;
            const ajdustToEmPadding = 2 * (setting.ajdustToEmPadding || 0);

            adjustToEmBox(glyfList, ascent, descent, ajdustToEmPadding);
        }

        return changed ? glyfList : [];
    }

    /**
     * 获取glyf列表
     *
     * @param {Array=} indexList 索引列表
     * @return {Array} glyflist
     */
    getGlyf(indexList) {
        const glyf = this.ttf.glyf;
        if (indexList && indexList.length) {
            return indexList.map((item) => glyf[item]);
        }

        return glyf;
    }


    /**
     * 查找相关字形
     *
     * @param  {Object} condition 查询条件
     * @param  {Array|number} condition.unicode unicode编码列表或者单个unicode编码
     * @param  {string} condition.name glyf名字，例如`uniE001`, `uniE`
     * @param  {Function} condition.filter 自定义过滤器
     * @example
     *     condition.filter = function (glyf) {
     *         return glyf.name === 'logo';
     *     }
     * @return {Array}  glyf字形索引列表
     */
    findGlyf(condition) {
        if (!condition) {
            return [];
        }


        const filters = [];

        // 按unicode数组查找
        if (condition.unicode) {
            const unicodeList = Array.isArray(condition.unicode) ? condition.unicode : [condition.unicode];
            const unicodeHash = {};
            unicodeList.forEach((unicode) => {
                if (typeof unicode === 'string') {
                    unicode = Number('0x' + unicode.slice(1));
                }
                unicodeHash[unicode] = true;
            });

            filters.push((glyf) => {
                if (!glyf.unicode || !glyf.unicode.length) {
                    return false;
                }

                for (let i = 0, l = glyf.unicode.length; i < l; i++) {
                    if (unicodeHash[glyf.unicode[i]]) {
                        return true;
                    }
                }
            });
        }

        // 按名字查找
        if (condition.name) {
            const name = condition.name;
            filters.push((glyf) => glyf.name && glyf.name.indexOf(name) === 0);
        }

        // 按筛选函数查找
        if (typeof condition.filter === 'function') {
            filters.push(condition.filter);
        }

        const indexList = [];
        this.ttf.glyf.forEach((glyf, index) => {
            for (let filterIndex = 0, filter; (filter = filters[filterIndex++]);) {
                if (true === filter(glyf)) {
                    indexList.push(index);
                    break;
                }
            }
        });

        return indexList;
    }


    /**
     * 更新指定的glyf
     *
     * @param {Object} glyf glyfobject
     * @param {string} index 需要替换的索引列表
     * @return {Array} 改变的glyf
     */
    replaceGlyf(glyf, index) {
        if (index >= 0 && index < this.ttf.glyf.length) {
            this.ttf.glyf[index] = glyf;
            return [glyf];
        }
        return [];
    }

    /**
     * 设置glyf
     *
     * @param {Array} glyfList glyf列表
     * @return {Array} 设置的glyf列表
     */
    setGlyf(glyfList) {
        delete this.glyf;
        this.ttf.glyf = glyfList || [];
        return this.ttf.glyf;
    }

    /**
     * 对字形按照unicode编码排序，此处不对复合字形进行排序，如果存在复合字形, 不进行排序
     *
     * @param {Array} glyfList glyf列表
     * @return {Array} 设置的glyf列表
     */
    sortGlyf() {
        const glyf = this.ttf.glyf;
        if (glyf.length > 1) {

            // 如果存在复合字形则退出
            if (glyf.some((a) => a.compound)) {
                return -2;
            }

            const notdef = glyf.shift();
            // 按代码点排序, 首先将空字形排到最后，然后按照unicode第一个编码进行排序
            glyf.sort((a, b) => {
                if ((!a.unicode || !a.unicode.length) && (!b.unicode || !b.unicode.length)) {
                    return 0;
                }
                else if ((!a.unicode || !a.unicode.length) && b.unicode) {
                    return 1;
                }
                else if (a.unicode && (!b.unicode || !b.unicode.length)) {
                    return -1;
                }
                return Math.min.apply(null, a.unicode) - Math.min.apply(null, b.unicode);
            });

            glyf.unshift(notdef);
            return glyf;
        }

        return -1;
    }



    /**
     * 设置名字
     *
     * @param {string} name 名字字段
     * @return {Object} 名字对象
     */
    setName(name) {

        if (name) {
            this.ttf.name.fontFamily = this.ttf.name.fullName = name.fontFamily || config.name.fontFamily;
            this.ttf.name.fontSubFamily = name.fontSubFamily || config.name.fontSubFamily;
            this.ttf.name.uniqueSubFamily = name.uniqueSubFamily || '';
            this.ttf.name.postScriptName = name.postScriptName || '';
        }

        return this.ttf.name;
    }

    /**
     * 设置head信息
     *
     * @param {Object} head 头部信息
     * @return {Object} 头对象
     */
    setHead(head) {
        if (head) {
            // unitsperem
            if (head.unitsPerEm && head.unitsPerEm >= 64 && head.unitsPerEm <= 16384) {
                this.ttf.head.unitsPerEm = head.unitsPerEm;
            }

            // lowestrecppem
            if (head.lowestRecPPEM && head.lowestRecPPEM >= 8 && head.lowestRecPPEM <= 16384) {
                this.ttf.head.lowestRecPPEM = head.lowestRecPPEM;
            }
            // created
            if (head.created) {
                this.ttf.head.created = head.created;
            }
            if (head.modified) {
                this.ttf.head.modified = head.modified;
            }
        }
        return this.ttf.head;
    }

    /**
     * 设置hhea信息
     *
     * @param {Object} fields 字段值
     * @return {Object} 头对象
     */
    setHhea(fields) {
        overwrite(this.ttf.hhea, fields, ['ascent', 'descent', 'lineGap']);
        return this.ttf.hhea;
    }

    /**
     * 设置OS2信息
     *
     * @param {Object} fields 字段值
     * @return {Object} 头对象
     */
    setOS2(fields) {
        overwrite(
            this.ttf['OS/2'], fields,
            [
                'usWinAscent', 'usWinDescent',
                'sTypoAscender', 'sTypoDescender', 'sTypoLineGap',
                'sxHeight', 'bXHeight', 'usWeightClass', 'usWidthClass',
                'yStrikeoutPosition', 'yStrikeoutSize',
                'achVendID',
                // panose
                'bFamilyType', 'bSerifStyle', 'bWeight', 'bProportion', 'bContrast',
                'bStrokeVariation', 'bArmStyle', 'bLetterform', 'bMidline', 'bXHeight'
            ]
        );
        return this.ttf['OS/2'];
    }

    /**
     * 设置post信息
     *
     * @param {Object} fields 字段值
     * @return {Object} 头对象
     */
    setPost(fields) {
        overwrite(
            this.ttf.post, fields,
            [
                'underlinePosition', 'underlineThickness'
            ]
        );
        return this.ttf.post;
    }


    /**
     * 计算度量信息
     *
     * @return {Object} 度量信息
     */
    calcMetrics() {
        let ascent = -16384;
        let descent = 16384;
        const uX = 0x78;
        const uH = 0x48;
        let sxHeight;
        let sCapHeight;
        this.ttf.glyf.forEach((g) => {

            if (g.yMax > ascent) {
                ascent = g.yMax;
            }

            if (g.yMin < descent) {
                descent = g.yMin;
            }

            if (g.unicode) {
                if (g.unicode.indexOf(uX) >= 0) {
                    sxHeight = g.yMax;
                }
                if (g.unicode.indexOf(uH) >= 0) {
                    sCapHeight = g.yMax;
                }
            }
        });

        ascent = Math.round(ascent);
        descent = Math.round(descent);

        return {

            // 此处非必须自动设置
            ascent,
            descent,
            sTypoAscender: ascent,
            sTypoDescender: descent,

            // 自动设置项目
            usWinAscent: ascent,
            usWinDescent: -descent,
            sxHeight: sxHeight || 0,
            sCapHeight: sCapHeight || 0
        };
    }


    /**
     * 优化ttf字形信息
     *
     * @return {Array} 改变的glyf
     */
    optimize() {
        return optimizettf(this.ttf);
    }

    /**
     * 复合字形转简单字形
     *
     * @param {Array=} indexList 索引列表
     * @return {Array} 改变的glyf
     */
    compound2simple(indexList) {

        const ttf = this.ttf;
        if (ttf.maxp && !ttf.maxp.maxComponentElements) {
            return [];
        }

        let i;
        let l;
        // 全部的compound glyf
        if (!indexList || !indexList.length) {
            indexList = [];
            for (i = 0, l = ttf.glyf.length; i < l; ++i) {
                if (ttf.glyf[i].compound) {
                    indexList.push(i);
                }
            }
        }

        const list = [];
        for (i = 0, l = indexList.length; i < l; ++i) {
            const glyfIndex = indexList[i];
            if (ttf.glyf[glyfIndex] && ttf.glyf[glyfIndex].compound) {
                compound2simpleglyf(glyfIndex, ttf, true);
                list.push(ttf.glyf[glyfIndex]);
            }
        }

        return list;
    }
}

/**
 * @file 字符串相关的函数
 * @author mengke01(kekee000@gmail.com)
 */

var string = {

    /**
     * HTML解码字符串
     *
     * @param {string} source 源字符串
     * @return {string}
     */
    decodeHTML(source) {

        const str = String(source)
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');

        // 处理转义的中文和实体字符
        return str.replace(/&#([\d]+);/g, ($0, $1) => String.fromCodePoint(parseInt($1, 10)));
    },

    /**
     * HTML编码字符串
     *
     * @param {string} source 源字符串
     * @return {string}
     */
    encodeHTML(source) {
        return String(source)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    /**
     * 获取string字节长度
     *
     * @param {string} source 源字符串
     * @return {number} 长度
     */
    getLength(source) {
        // eslint-disable-next-line no-control-regex
        return String(source).replace(/[^\x00-\xff]/g, '11').length;
    },

    /**
     * 字符串格式化，支持如 ${xxx.xxx} 的语法
     *
     * @param {string} source 模板字符串
     * @param {Object} data 数据
     * @return {string} 格式化后字符串
     */
    format(source, data) {
        return source.replace(/\$\{([\w.]+)\}/g, ($0, $1) => {
            const ref = $1.split('.');
            let refObject = data;
            let level;

            while (refObject != null && (level = ref.shift())) {
                refObject = refObject[level];
            }

            return refObject != null ? refObject : '';
        });
    },

    /**
     * 使用指定字符填充字符串,默认`0`
     *
     * @param {string} str 字符串
     * @param {number} size 填充到的大小
     * @param {string=} ch 填充字符
     * @return {string} 字符串
     */
    pad(str, size, ch) {
        str = String(str);
        if (str.length > size) {
            return str.slice(str.length - size);
        }
        return new Array(size - str.length + 1).join(ch || '0') + str;
    },

    /**
     * 获取字符串哈希编码
     *
     * @param {string} str 字符串
     * @return {number} 哈希值
     */
    hashcode(str) {
        if (!str) {
            return 0;
        }

        let hash = 0;
        for (let i = 0, l = str.length; i < l; i++) {
            hash = 0x7FFFFFFFF & (hash * 31 + str.charCodeAt(i));
        }
        return hash;
    }
};

/**
 * @file 用于国际化的字符串管理类
 * @author mengke01(kekee000@gmail.com)
 */

function appendLanguage(store, languageList) {
    languageList.forEach(item => {
        const language = item[0];
        store[language] = Object.assign(store[language] || {}, item[1]);
    });
    return store;
}

/**
 * 管理国际化字符，根据lang切换语言版本
 *
 * @class I18n
 * @param {Array} languageList 当前支持的语言列表
 * @param {string=} defaultLanguage 默认语言
 * languageList = [
 *     'en-us', // 语言名称
 *     langObject // 语言字符串列表
 * ]
 */
class I18n {
    constructor(languageList, defaultLanguage) {
        this.store = appendLanguage({}, languageList);
        this.setLanguage(
            defaultLanguage
            || typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase()
            || 'en-us'
        );
    }

    /**
     * 设置语言
     *
     * @param {string} language 语言
     * @return {this}
     */
    setLanguage(language) {
        if (!this.store[language]) {
            language = 'en-us';
        }
        this.lang = this.store[this.language = language];
        return this;
    }

    /**
     * 添加一个语言字符串
     *
     * @param {string} language 语言
     * @param {Object} langObject 语言对象
     * @return {this}
     */
    addLanguage(language, langObject) {
        appendLanguage(this.store, [[language, langObject]]);
        return this;
    }

    /**
     * 获取当前语言字符串
     *
     * @param  {string} path 语言路径
     * @return {string}      语言字符串
     */
    get(path) {
        const ref = path.split('.');
        let refObject = this.lang;
        let level;
        while (refObject != null && (level = ref.shift())) {
            refObject = refObject[level];
        }
        return refObject != null ? refObject : '';
    }
}

/**
 * @file 语言字符串管理
 * @author mengke01(kekee000@gmail.com)
 */

const zh = {
    // error define
    10001: '超出读取范围：${0}, ${1}',
    10002: '超出写入范围：${0}, ${1}',
    10003: '未知数据类型：${0}, ${1}',
    10004: '不支持svg解析',

    10101: '错误的ttf文件',
    10102: '错误的woff文件',
    10103: '错误的svg文件',
    10104: '读取ttf文件错误',
    10105: '读取woff文件错误',
    10106: '读取svg文件错误',
    10107: '写入ttf文件错误',
    10108: '写入woff文件错误',
    10109: '写入svg文件错误',
    10112: '写入svg symbol 错误',

    10110: '读取eot文件错误',
    10111: '读取eot字体错误',

    10200: '重复的unicode代码点，字形序号：${0}',
    10201: 'ttf字形轮廓数据为空',
    10202: '不支持标志位：ARGS_ARE_XY_VALUES',
    10203: '未找到表：${0}',
    10204: '读取ttf表错误',
    10205: '未找到解压函数',

    10301: '错误的otf文件',
    10302: '读取otf表错误',
    10303: 'otf字形轮廓数据为空'
};


const en = {
    // error define
    10001: 'Reading index out of range: ${0}, ${1}',
    10002: 'Writing index out of range: ${0}, ${1}',
    10003: 'Unknown datatype: ${0}, ${1}',
    10004: 'No svg parser',

    10101: 'ttf file damaged',
    10102: 'woff file damaged',
    10103: 'svg file damaged',
    10104: 'Read ttf error',
    10105: 'Read woff error',
    10106: 'Read svg error',
    10107: 'Write ttf error',
    10108: 'Write woff error',
    10109: 'Write svg error',
    10112: 'Write svg symbol error',

    10110: 'Read eot error',
    10111: 'Write eot error',

    10200: 'Repeat unicode, glyph index: ${0}',
    10201: 'ttf `glyph` data is empty',
    10202: 'Not support compound glyph flag: ARGS_ARE_XY_VALUES',
    10203: 'No ttf table: ${0}',
    10204: 'Read ttf table data error',
    10205: 'No zip deflate function',

    10301: 'otf file damaged',
    10302: 'Read otf table error',
    10303: 'otf `glyph` data is empty'
};


var i18n = new I18n(
    [
        ['zh-cn', zh],
        ['en-us', en]
    ],
    typeof window !== 'undefined' ? window.language : 'en-us'
);

/**
 * @file ttf 相关错误号定义
 * @author mengke01(kekee000@gmail.com)
 */

var error = {

    /**
     * 抛出一个异常
     *
     * @param  {Object} e 异常号或者异常对象
     * @param  {...Array} fargs args 参数
     *
     * 例如：
     * e = 1001
     * e = {
     *     number: 1001,
     *     data: 错误数据
     * }
     */
    raise(e, ...fargs) {
        let number;
        let data;
        if (typeof e === 'object') {
            number = e.number || 0;
            data = e.data;
        }
        else {
            number = e;
        }

        let message = i18n.lang[number];
        if (fargs.length > 0) {
            const args = typeof fargs[0] === 'object'
                ? fargs[0]
                : fargs;
            message = string.format(message, args);
        }

        const event = new Error(message);
        event.number = number;
        if (data) {
            event.data = data;
        }

        throw event;
    }
};

/**
 * @file 数据读取器
 * @author mengke01(kekee000@gmail.com)
 *
 * thanks to：
 * ynakajima/ttf.js
 * https://github.com/ynakajima/ttf.js
 */

// 检查数组支持情况
if (typeof ArrayBuffer === 'undefined' || typeof DataView === 'undefined') {
    throw new Error('not support ArrayBuffer and DataView');
}

// 数据类型
const dataType$1 = {
    Int8: 1,
    Int16: 2,
    Int32: 4,
    Uint8: 1,
    Uint16: 2,
    Uint32: 4,
    Float32: 4,
    Float64: 8
};

class Reader {

    /**
     * 读取器
     *
     * @constructor
     * @param {Array.<byte>} buffer 缓冲数组
     * @param {number} offset 起始偏移
     * @param {number} length 数组长度
     * @param {boolean} littleEndian 是否小尾
     */
    constructor(buffer, offset, length, littleEndian) {

        const bufferLength = buffer.byteLength || buffer.length;

        this.offset = offset || 0;
        this.length = length || (bufferLength - this.offset);
        this.littleEndian = littleEndian || false;

        this.view = new DataView(buffer, this.offset, this.length);
    }

    /**
     * 读取指定的数据类型
     *
     * @param {string} type 数据类型
     * @param {number=} offset 位移
     * @param {boolean=} littleEndian 是否小尾
     * @return {number} 返回值
     */
    read(type, offset, littleEndian) {

        // 使用当前位移
        if (undefined === offset) {
            offset = this.offset;
        }

        // 使用小尾
        if (undefined === littleEndian) {
            littleEndian = this.littleEndian;
        }

        // 扩展方法
        if (undefined === dataType$1[type]) {
            return this['read' + type](offset, littleEndian);
        }

        const size = dataType$1[type];
        this.offset = offset + size;
        return this.view['get' + type](offset, littleEndian);
    }

    /**
     * 获取指定的字节数组
     *
     * @param {number} offset 偏移
     * @param {number} length 字节长度
     * @return {Array} 字节数组
     */
    readBytes(offset, length = null) {

        if (length == null) {
            length = offset;
            offset = this.offset;
        }

        if (length < 0 || offset + length > this.length) {
            error.raise(10001, this.length, offset + length);
        }

        const buffer = [];
        for (let i = 0; i < length; ++i) {
            buffer.push(this.view.getUint8(offset + i));
        }

        this.offset = offset + length;
        return buffer;
    }

    /**
     * 读取一个string
     *
     * @param {number} offset 偏移
     * @param {number} length 长度
     * @return {string} 字符串
     */
    readString(offset, length = null) {

        if (length == null) {
            length = offset;
            offset = this.offset;
        }

        if (length < 0 || offset + length > this.length) {
            error.raise(10001, this.length, offset + length);
        }

        let value = '';
        for (let i = 0; i < length; ++i) {
            const c = this.readUint8(offset + i);
            value += String.fromCharCode(c);
        }

        this.offset = offset + length;

        return value;
    }

    /**
     * 读取一个字符
     *
     * @param {number} offset 偏移
     * @return {string} 字符串
     */
    readChar(offset) {
        return this.readString(offset, 1);
    }

    /**
     * 读取一个uint24整形
     *
     * @param {number} offset 偏移
     * @return {number}
     */
    readUint24(offset) {
        const [i, j, k] = this.readBytes(offset || this.offset, 3);
        return (i << 16) + (j << 8) + k;
    }

    /**
     * 读取fixed类型
     *
     * @param {number} offset 偏移
     * @return {number} float
     */
    readFixed(offset) {
        if (undefined === offset) {
            offset = this.offset;
        }
        const val = this.readInt32(offset, false) / 65536.0;
        return Math.ceil(val * 100000) / 100000;
    }

    /**
     * 读取长日期
     *
     * @param {number} offset 偏移
     * @return {Date} Date对象
     */
    readLongDateTime(offset) {
        if (undefined === offset) {
            offset = this.offset;
        }

        // new Date(1970, 1, 1).getTime() - new Date(1904, 1, 1).getTime();
        const delta = -2077545600000;
        const time = this.readUint32(offset + 4, false);
        const date = new Date();
        date.setTime(time * 1000 + delta);
        return date;
    }

    /**
     * 跳转到指定偏移
     *
     * @param {number} offset 偏移
     * @return {Object} this
     */
    seek(offset) {
        if (undefined === offset) {
            this.offset = 0;
        }

        if (offset < 0 || offset > this.length) {
            error.raise(10001, this.length, offset);
        }

        this.offset = offset;

        return this;
    }

    /**
     * 注销
     */
    dispose() {
        delete this.view;
    }
}

// 直接支持的数据类型
Object.keys(dataType$1).forEach((type) => {
    Reader.prototype['read' + type] = curry(Reader.prototype.read, type);
});

/**
 * @file 数据写入器
 * @author mengke01(kekee000@gmail.com)
 */

// 检查数组支持情况
if (typeof ArrayBuffer === 'undefined' || typeof DataView === 'undefined') {
    throw new Error('not support ArrayBuffer and DataView');
}

// 数据类型
const dataType = {
    Int8: 1,
    Int16: 2,
    Int32: 4,
    Uint8: 1,
    Uint16: 2,
    Uint32: 4,
    Float32: 4,
    Float64: 8
};


/**
 * 读取器
 *
 * @constructor
 * @param {Array.<byte>} buffer 缓冲数组
 * @param {number} offset 起始偏移
 * @param {number=} length 数组长度
 * @param {boolean=} littleEndian 是否小尾
 */
class Writer {
    constructor(buffer, offset, length, littleEndian) {
        const bufferLength = buffer.byteLength || buffer.length;
        this.offset = offset || 0;
        this.length = length || (bufferLength - this.offset);
        this.littleEndian = littleEndian || false;
        this.view = new DataView(buffer, this.offset, this.length);
    }

    /**
     * 读取指定的数据类型
     *
     * @param {string} type 数据类型
     * @param {number} value value值
     * @param {number=} offset 位移
     * @param {boolean=} littleEndian 是否小尾
     *
     * @return {this}
     */
    write(type, value, offset, littleEndian) {

        // 使用当前位移
        if (undefined === offset) {
            offset = this.offset;
        }

        // 使用小尾
        if (undefined === littleEndian) {
            littleEndian = this.littleEndian;
        }

        // 扩展方法
        if (undefined === dataType[type]) {
            return this['write' + type](value, offset, littleEndian);
        }

        const size = dataType[type];
        this.offset = offset + size;
        this.view['set' + type](offset, value, littleEndian);
        return this;
    }

    /**
     * 写入指定的字节数组
     *
     * @param {ArrayBuffer} value 写入值
     * @param {number=} length 数组长度
     * @param {number=} offset 起始偏移
     * @return {this}
     */
    writeBytes(value, length, offset) {

        length = length || value.byteLength || value.length;
        let i;

        if (!length) {
            return this;
        }

        if (undefined === offset) {
            offset = this.offset;
        }

        if (length < 0 || offset + length > this.length) {
            error.raise(10002, this.length, offset + length);
        }

        const littleEndian = this.littleEndian;
        if (value instanceof ArrayBuffer) {
            const view = new DataView(value, 0, length);
            for (i = 0; i < length; ++i) {
                this.view.setUint8(offset + i, view.getUint8(i, littleEndian), littleEndian);
            }
        }
        else {
            for (i = 0; i < length; ++i) {
                this.view.setUint8(offset + i, value[i], littleEndian);
            }
        }

        this.offset = offset + length;

        return this;
    }

    /**
     * 写空数据
     *
     * @param {number} length 长度
     * @param {number=} offset 起始偏移
     * @return {this}
     */
    writeEmpty(length, offset) {

        if (length < 0) {
            error.raise(10002, this.length, length);
        }

        if (undefined === offset) {
            offset = this.offset;
        }

        const littleEndian = this.littleEndian;
        for (let i = 0; i < length; ++i) {
            this.view.setUint8(offset + i, 0, littleEndian);
        }

        this.offset = offset + length;

        return this;
    }

    /**
     * 写入一个string
     *
     * @param {string} str 字符串
     * @param {number=} length 长度
     * @param {number=} offset 偏移
     *
     * @return {this}
     */
    writeString(str = '', length, offset) {

        if (undefined === offset) {
            offset = this.offset;
        }

        // eslint-disable-next-line no-control-regex
        length = length || str.replace(/[^\x00-\xff]/g, '11').length;

        if (length < 0 || offset + length > this.length) {
            error.raise(10002, this.length, offset + length);
        }

        this.seek(offset);

        for (let i = 0, l = str.length, charCode; i < l; ++i) {
            charCode = str.charCodeAt(i) || 0;
            if (charCode > 127) {
                // unicode编码可能会超出2字节,
                // 写入与编码有关系，此处不做处理
                this.writeUint16(charCode);
            }
            else {
                this.writeUint8(charCode);
            }
        }

        this.offset = offset + length;

        return this;
    }

    /**
     * 写入一个字符
     *
     * @param {string} value 字符
     * @param {number=} offset 偏移
     * @return {this}
     */
    writeChar(value, offset) {
        return this.writeString(value, offset);
    }

    /**
     * 写入fixed类型
     *
     * @param {number} value 写入值
     * @param {number=} offset 偏移
     * @return {number} float
     */
    writeFixed(value, offset) {
        if (undefined === offset) {
            offset = this.offset;
        }
        this.writeInt32(Math.round(value * 65536), offset);

        return this;
    }

    /**
     * 写入长日期
     *
     * @param {Date} value 日期对象
     * @param {number=} offset 偏移
     *
     * @return {Date} Date对象
     */
    writeLongDateTime(value, offset) {

        if (undefined === offset) {
            offset = this.offset;
        }

        // new Date(1970, 1, 1).getTime() - new Date(1904, 1, 1).getTime();
        const delta = -2077545600000;

        if (typeof value === 'undefined') {
            value = delta;
        }
        else if (typeof value.getTime === 'function') {
            value = value.getTime();
        }
        else if (/^\d+$/.test(value)) {
            value = +value;
        }
        else {
            value = Date.parse(value);
        }

        const time = Math.round((value - delta) / 1000);
        this.writeUint32(0, offset);
        this.writeUint32(time, offset + 4);

        return this;
    }

    /**
     * 跳转到指定偏移
     *
     * @param {number=} offset 偏移
     * @return {this}
     */
    seek(offset) {
        if (undefined === offset) {
            this.offset = 0;
        }

        if (offset < 0 || offset > this.length) {
            error.raise(10002, this.length, offset);
        }

        this._offset = this.offset;
        this.offset = offset;

        return this;
    }

    /**
     * 跳转到写入头部位置
     *
     * @return {this}
     */
    head() {
        this.offset = this._offset || 0;
        return this;
    }

    /**
     * 获取缓存的byte数组
     *
     * @return {ArrayBuffer}
     */
    getBuffer() {
        return this.view.buffer;
    }

    /**
     * 注销
     */
    dispose() {
        delete this.view;
    }
}

// 直接支持的数据类型
Object.keys(dataType).forEach(type => {
    Writer.prototype['write' + type] = curry(Writer.prototype.write, type);
});

/**
 * @file woff转换ttf
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * woff格式转换成ttf字体格式
 *
 * @param {ArrayBuffer} woffBuffer woff缓冲数组
 * @param {Object} options 选项
 * @param {Object} options.inflate 解压相关函数
 *
 * @return {ArrayBuffer} ttf格式byte流
 */
function woff2ttf(woffBuffer, options = {}) {
    const reader = new Reader(woffBuffer);
    const signature = reader.readUint32(0);
    const flavor = reader.readUint32(4);

    if (signature !== 0x774F4646 || (flavor !== 0x10000 && flavor !== 0x4f54544f)) {
        reader.dispose();
        error.raise(10102);
    }

    const numTables = reader.readUint16(12);
    const ttfSize = reader.readUint32(16);
    const tableEntries = [];
    let tableEntry;
    let i;
    let l;

    // 读取woff表索引信息
    for (i = 0; i < numTables; ++i) {
        reader.seek(44 + i * 20);
        tableEntry = {
            tag: reader.readString(reader.offset, 4),
            offset: reader.readUint32(),
            compLength: reader.readUint32(),
            length: reader.readUint32(),
            checkSum: reader.readUint32()
        };

        // ttf 表数据
        const deflateData = reader.readBytes(tableEntry.offset, tableEntry.compLength);
        // 需要解压
        if (deflateData.length < tableEntry.length) {

            if (!options.inflate) {
                reader.dispose();
                error.raise(10105);
            }

            tableEntry.data = options.inflate(deflateData);
        }
        else {
            tableEntry.data = deflateData;
        }

        tableEntry.length = tableEntry.data.length;
        tableEntries.push(tableEntry);
    }


    const writer = new Writer(new ArrayBuffer(ttfSize));
    // 写头部
    const entrySelector = Math.floor(Math.log(numTables) / Math.LN2);
    const searchRange = Math.pow(2, entrySelector) * 16;
    const rangeShift = numTables * 16 - searchRange;

    writer.writeUint32(flavor);
    writer.writeUint16(numTables);
    writer.writeUint16(searchRange);
    writer.writeUint16(entrySelector);
    writer.writeUint16(rangeShift);

    // 写ttf表索引
    let tblOffset = 12 + 16 * tableEntries.length;
    for (i = 0, l = tableEntries.length; i < l; ++i) {
        tableEntry = tableEntries[i];
        writer.writeString(tableEntry.tag);
        writer.writeUint32(tableEntry.checkSum);
        writer.writeUint32(tblOffset);
        writer.writeUint32(tableEntry.length);
        tblOffset += tableEntry.length
            + (tableEntry.length % 4 ? 4 - tableEntry.length % 4 : 0);
    }

    // 写ttf表数据
    for (i = 0, l = tableEntries.length; i < l; ++i) {
        tableEntry = tableEntries[i];
        writer.writeBytes(tableEntry.data);
        if (tableEntry.length % 4) {
            writer.writeEmpty(4 - tableEntry.length % 4);
        }
    }

    return writer.getBuffer();
}

/**
 * @file ttf基本数据结构
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6.html
 */

const struct = {
    Int8: 1,
    Uint8: 2,
    Int16: 3,
    Uint16: 4,
    Int32: 5,
    Uint32: 6,
    Fixed: 7, // 32-bit signed fixed-point number (16.16)
    FUnit: 8, // Smallest measurable distance in the em space
    // 16-bit signed fixed number with the low 14 bits of fraction
    F2Dot14: 11,
    // The long internal format of a date in seconds since 12:00 midnight,
    // January 1, 1904. It is represented as a signed 64-bit integer.
    LongDateTime: 12,

    // extend data type
    Char: 13,
    String: 14,
    Bytes: 15,
    Uint24: 20
};

// 反转名字查找
const names = {};
Object.keys(struct).forEach((key) => {
    names[struct[key]] = key;
});

struct.names = names;

/**
 * @file ttf表基类
 * @author mengke01(kekee000@gmail.com)
 */
/* eslint-disable no-invalid-this */
/**
 * 读取表结构
 *
 * @param {Reader} reader reader对象
 * @return {Object} 当前对象
 */
function read$1(reader) {

    const offset = this.offset;

    if (undefined !== offset) {
        reader.seek(offset);
    }

    const me = this;

    this.struct.forEach((item) => {
        const name = item[0];
        const type = item[1];
        let typeName = null;
        switch (type) {
        case struct.Int8:
        case struct.Uint8:
        case struct.Int16:
        case struct.Uint16:
        case struct.Int32:
        case struct.Uint32:
            typeName = struct.names[type];
            me[name] = reader.read(typeName);
            break;

        case struct.Fixed:
            me[name] = reader.readFixed();
            break;

        case struct.LongDateTime:
            me[name] = reader.readLongDateTime();
            break;

        case struct.Bytes:
            me[name] = reader.readBytes(reader.offset, item[2] || 0);
            break;

        case struct.Char:
            me[name] = reader.readChar();
            break;

        case struct.String:
            me[name] = reader.readString(reader.offset, item[2] || 0);
            break;

        default:
            error.raise(10003, name, type);
        }
    });

    return this.valueOf();
}

/**
 * 写表结构
 *
 * @param {Object} writer writer对象
 * @param {Object} ttf 已解析的ttf对象
 *
 * @return {Writer} 返回writer对象
 */
function write$2(writer, ttf) {
    const table = ttf[this.name];

    if (!table) {
        error.raise(10203, this.name);
    }

    this.struct.forEach((item) => {
        const name = item[0];
        const type = item[1];
        let typeName = null;
        switch (type) {
        case struct.Int8:
        case struct.Uint8:
        case struct.Int16:
        case struct.Uint16:
        case struct.Int32:
        case struct.Uint32:
            typeName = struct.names[type];
            writer.write(typeName, table[name]);
            break;

        case struct.Fixed:
            writer.writeFixed(table[name]);
            break;

        case struct.LongDateTime:
            writer.writeLongDateTime(table[name]);
            break;

        case struct.Bytes:
            writer.writeBytes(table[name], item[2] || 0);
            break;

        case struct.Char:
            writer.writeChar(table[name]);
            break;

        case struct.String:
            writer.writeString(table[name], item[2] || 0);
            break;

        default:
            error.raise(10003, name, type);
        }
    });

    return writer;
}

/**
 * 获取ttf表的size大小
 *
 * @param {string} name 表名
 * @return {number} 表大小
 */
function size() {

    let sz = 0;
    this.struct.forEach((item) => {
        const type = item[1];
        switch (type) {
        case struct.Int8:
        case struct.Uint8:
            sz += 1;
            break;

        case struct.Int16:
        case struct.Uint16:
            sz += 2;
            break;

        case struct.Int32:
        case struct.Uint32:
        case struct.Fixed:
            sz += 4;
            break;

        case struct.LongDateTime:
            sz += 8;
            break;

        case struct.Bytes:
            sz += item[2] || 0;
            break;

        case struct.Char:
            sz += 1;
            break;

        case struct.String:
            sz += item[2] || 0;
            break;

        default:
            error.raise(10003, name, type);
        }
    });

    return sz;
}

/**
 * 获取对象的值
 *
 * @return {*} 当前对象的值
 */
function valueOf() {
    const val = {};
    const me = this;
    this.struct.forEach(item => {
        val[item[0]] = me[item[0]];
    });

    return val;
}

var table = {
    read: read$1,
    write: write$2,
    size,
    valueOf,

    /**
     * 创建一个表结构
     *
     * @param {string} name 表名
     * @param {Object} struct 表结构
     * @param {Object} prototype 原型
     * @return {Function} 表构造函数
     */
    create(name, struct, prototype) {
        class Table {
            constructor(offset) {
                this.name = name;
                this.struct = struct;
                this.offset = offset;
            }
        }

        Table.prototype.read = read$1;
        Table.prototype.write = write$2;
        Table.prototype.size = size;
        Table.prototype.valueOf = valueOf;
        Object.assign(Table.prototype, prototype);
        return Table;
    }
};

/**
 * @file directory 表, 读取和写入ttf表索引
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6.html
 */

var Directory = table.create(
    'directory',
    [],
    {
        read(reader, ttf) {
            const tables = {};
            const numTables = ttf.numTables;
            const offset = this.offset;

            for (let i = offset, l = numTables * 16; i < l; i += 16) {
                const name = reader.readString(i, 4).trim();

                tables[name] = {
                    name,
                    checkSum: reader.readUint32(i + 4),
                    offset: reader.readUint32(i + 8),
                    length: reader.readUint32(i + 12)
                };
            }

            return tables;
        },

        write(writer, ttf) {

            const tables = ttf.support.tables;
            for (let i = 0, l = tables.length; i < l; i++) {
                writer.writeString((tables[i].name + '    ').slice(0, 4));
                writer.writeUint32(tables[i].checkSum);
                writer.writeUint32(tables[i].offset);
                writer.writeUint32(tables[i].length);
            }

            return writer;
        },

        size(ttf) {
            return ttf.numTables * 16;
        }
    }
);

/**
 * @file head表
 * @author mengke01(kekee000@gmail.com)
 */

var head = table.create(
    'head',
    [
        ['version', struct.Fixed],
        ['fontRevision', struct.Fixed],
        ['checkSumAdjustment', struct.Uint32],
        ['magickNumber', struct.Uint32],
        ['flags', struct.Uint16],
        ['unitsPerEm', struct.Uint16],
        ['created', struct.LongDateTime],
        ['modified', struct.LongDateTime],
        ['xMin', struct.Int16],
        ['yMin', struct.Int16],
        ['xMax', struct.Int16],
        ['yMax', struct.Int16],
        ['macStyle', struct.Uint16],
        ['lowestRecPPEM', struct.Uint16],
        ['fontDirectionHint', struct.Int16],
        ['indexToLocFormat', struct.Int16],
        ['glyphDataFormat', struct.Int16]
    ]
);

/**
 * @file maxp 表
 * @author mengke01(kekee000@gmail.com)
 */

var maxp = table.create(
    'maxp',
    [
        ['version', struct.Fixed],
        ['numGlyphs', struct.Uint16],
        ['maxPoints', struct.Uint16],
        ['maxContours', struct.Uint16],
        ['maxCompositePoints', struct.Uint16],
        ['maxCompositeContours', struct.Uint16],
        ['maxZones', struct.Uint16],
        ['maxTwilightPoints', struct.Uint16],
        ['maxStorage', struct.Uint16],
        ['maxFunctionDefs', struct.Uint16],
        ['maxInstructionDefs', struct.Uint16],
        ['maxStackElements', struct.Uint16],
        ['maxSizeOfInstructions', struct.Uint16],
        ['maxComponentElements', struct.Uint16],
        ['maxComponentDepth', struct.Int16]
    ],
    {

        write(writer, ttf) {
            table.write.call(this, writer, ttf.support);
            return writer;
        },

        size() {
            return 32;
        }
    }
);

/* eslint-disable */

/**
 * @file 读取windows支持的字符集
 * @author mengke01(kekee000@gmail.com)
 *
 * @see
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cmap.html
 */

/**
 * 读取ttf中windows字符表的字符
 *
 * @param {Array} tables cmap表结构
 * @param {Object} ttf ttf对象
 * @return {Object} 字符字典索引，unicode => glyf index
 */
function readWindowsAllCodes(tables, ttf) {

    let codes = {};

    // 读取windows unicode 编码段
    let format0 = tables.find(function (item) {
        return item.format === 0;
    });

    // 读取windows unicode 编码段
    let format12 = tables.find(function (item) {
        return item.platformID === 3
            && item.encodingID === 10
            && item.format === 12;
    });

    let format4 = tables.find(function (item) {
        return item.platformID === 3
            && item.encodingID === 1
            && item.format === 4;
    });

    let format2 = tables.find(function (item) {
        return item.platformID === 3
            && item.encodingID === 3
            && item.format === 2;
    });

    let format14 = tables.find(function (item) {
        return item.platformID === 0
            && item.encodingID === 5
            && item.format === 14;
    });

    if (format0) {
        for (let i = 0, l = format0.glyphIdArray.length; i < l; i++) {
            if (format0.glyphIdArray[i]) {
                codes[i] = format0.glyphIdArray[i];
            }
        }
    }

    // format 14 support
    if (format14) {
        for (let i = 0, l = format14.groups.length; i < l; i++) {
            let {unicode, glyphId} = format14.groups[i];
            if (unicode) {
                codes[unicode] = glyphId;
            }
        }
    }

    // 读取format12表
    if (format12) {
        for (let i = 0, l = format12.nGroups; i < l; i++) {
            let group = format12.groups[i];
            let startId = group.startId;
            let start = group.start;
            let end = group.end;
            for (;start <= end;) {
                codes[start++] = startId++;
            }
        }
    }
    // 读取format4表
    else if (format4) {
        let segCount = format4.segCountX2 / 2;
        // graphIdArray 和idRangeOffset的偏移量
        let graphIdArrayIndexOffset = (format4.glyphIdArrayOffset - format4.idRangeOffsetOffset) / 2;

        for (let i = 0; i < segCount; ++i) {
            // 读取单个字符
            for (let start = format4.startCode[i], end = format4.endCode[i]; start <= end; ++start) {
                // range offset = 0
                if (format4.idRangeOffset[i] === 0) {
                    codes[start] = (start + format4.idDelta[i]) % 0x10000;
                }
                // rely on to glyphIndexArray
                else {
                    let index = i + format4.idRangeOffset[i] / 2
                        + (start - format4.startCode[i])
                        - graphIdArrayIndexOffset;

                    let graphId = format4.glyphIdArray[index];
                    if (graphId !== 0) {
                        codes[start] = (graphId + format4.idDelta[i]) % 0x10000;
                    }
                    else {
                        codes[start] = 0;
                    }

                }
            }
        }

        delete codes[65535];
    }
    // 读取format2表
    // see https://github.com/fontforge/fontforge/blob/master/fontforge/parsettf.c
    else if (format2) {
        let subHeadKeys = format2.subHeadKeys;
        let subHeads = format2.subHeads;
        let glyphs = format2.glyphs;
        let numGlyphs = ttf.maxp.numGlyphs;
        let index = 0;

        for (let i = 0; i < 256; i++) {
            // 单字节编码
            if (subHeadKeys[i] === 0) {
                if (i >= format2.maxPos) {
                    index = 0;
                }
                else if (i < subHeads[0].firstCode
                    || i >= subHeads[0].firstCode + subHeads[0].entryCount
                    || subHeads[0].idRangeOffset + (i - subHeads[0].firstCode) >= glyphs.length) {
                    index = 0;
                }
                else if ((index = glyphs[subHeads[0].idRangeOffset + (i - subHeads[0].firstCode)]) !== 0) {
                    index = index + subHeads[0].idDelta;
                }

                // 单字节解码
                if (index !== 0 && index < numGlyphs) {
                    codes[i] = index;
                }
            }
            else {
                let k = subHeadKeys[i];
                for (let j = 0, entryCount = subHeads[k].entryCount; j < entryCount; j++) {
                    if (subHeads[k].idRangeOffset + j >= glyphs.length) {
                        index = 0;
                    }
                    else if ((index = glyphs[subHeads[k].idRangeOffset + j]) !== 0) {
                        index = index + subHeads[k].idDelta;
                    }

                    if (index !== 0 && index < numGlyphs) {
                        let unicode = ((i << 8) | (j + subHeads[k].firstCode)) % 0xffff;
                        codes[unicode] = index;
                    }

                }
            }
        }
    }

    return codes;
}

/**
 * @file 解析cmap表
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 读取cmap子表
 *
 * @param {Reader} reader Reader对象
 * @param {Object} ttf ttf对象
 * @param {Object} subTable 子表对象
 * @param {number} cmapOffset 子表的偏移
 */
function readSubTable(reader, ttf, subTable, cmapOffset) {
    let i;
    let l;
    let glyphIdArray;
    const startOffset = cmapOffset + subTable.offset;
    let glyphCount;
    subTable.format = reader.readUint16(startOffset);

    // 0～256 紧凑排列
    if (subTable.format === 0) {
        const format0 = subTable;
        // 跳过format字段
        format0.length = reader.readUint16();
        format0.language = reader.readUint16();
        glyphIdArray = [];
        for (i = 0, l = format0.length - 6; i < l; i++) {
            glyphIdArray.push(reader.readUint8());
        }
        format0.glyphIdArray = glyphIdArray;
    }
    else if (subTable.format === 2) {
        const format2 = subTable;
        // 跳过format字段
        format2.length = reader.readUint16();
        format2.language = reader.readUint16();

        const subHeadKeys = [];
        let maxSubHeadKey = 0;// 最大索引
        let maxPos = -1; // 最大位置
        for (let i = 0, l = 256; i < l; i++) {
            subHeadKeys[i] = reader.readUint16() / 8;
            if (subHeadKeys[i] > maxSubHeadKey) {
                maxSubHeadKey = subHeadKeys[i];
                maxPos = i;
            }
        }

        const subHeads = [];
        for (i = 0; i <= maxSubHeadKey; i++) {
            subHeads[i] = {
                firstCode: reader.readUint16(),
                entryCount: reader.readUint16(),
                idDelta: reader.readUint16(),
                idRangeOffset: (reader.readUint16() - (maxSubHeadKey - i) * 8 - 2) / 2
            };
        }

        glyphCount = (startOffset + format2.length - reader.offset) / 2;
        const glyphs = [];
        for (i = 0; i < glyphCount; i++) {
            glyphs[i] = reader.readUint16();
        }

        format2.subHeadKeys = subHeadKeys;
        format2.maxPos = maxPos;
        format2.subHeads = subHeads;
        format2.glyphs = glyphs;

    }
    // 双字节编码，非紧凑排列
    else if (subTable.format === 4) {
        const format4 = subTable;
        // 跳过format字段
        format4.length = reader.readUint16();
        format4.language = reader.readUint16();
        format4.segCountX2 = reader.readUint16();
        format4.searchRange = reader.readUint16();
        format4.entrySelector = reader.readUint16();
        format4.rangeShift = reader.readUint16();

        const segCount = format4.segCountX2 / 2;

        // end code
        const endCode = [];
        for (i = 0; i < segCount; ++i) {
            endCode.push(reader.readUint16());
        }
        format4.endCode = endCode;

        format4.reservedPad = reader.readUint16();

        // start code
        const startCode = [];
        for (i = 0; i < segCount; ++i) {
            startCode.push(reader.readUint16());
        }
        format4.startCode = startCode;

        // idDelta
        const idDelta = [];
        for (i = 0; i < segCount; ++i) {
            idDelta.push(reader.readUint16());
        }
        format4.idDelta = idDelta;


        format4.idRangeOffsetOffset = reader.offset;

        // idRangeOffset
        const idRangeOffset = [];
        for (i = 0; i < segCount; ++i) {
            idRangeOffset.push(reader.readUint16());
        }
        format4.idRangeOffset = idRangeOffset;

        // 总长度 - glyphIdArray起始偏移/2
        glyphCount = (format4.length - (reader.offset - startOffset)) / 2;

        // 记录array offset
        format4.glyphIdArrayOffset = reader.offset;

        // glyphIdArray
        glyphIdArray = [];
        for (i = 0; i < glyphCount; ++i) {
            glyphIdArray.push(reader.readUint16());
        }

        format4.glyphIdArray = glyphIdArray;
    }

    else if (subTable.format === 6) {
        const format6 = subTable;

        format6.length = reader.readUint16();
        format6.language = reader.readUint16();
        format6.firstCode = reader.readUint16();
        format6.entryCount = reader.readUint16();

        // 记录array offset
        format6.glyphIdArrayOffset = reader.offset;

        const glyphIndexArray = [];
        const entryCount = format6.entryCount;
        // 读取字符分组
        for (i = 0; i < entryCount; ++i) {
            glyphIndexArray.push(reader.readUint16());
        }
        format6.glyphIdArray = glyphIndexArray;

    }
    // defines segments for sparse representation in 4-byte character space
    else if (subTable.format === 12) {
        const format12 = subTable;

        format12.reserved = reader.readUint16();
        format12.length = reader.readUint32();
        format12.language = reader.readUint32();
        format12.nGroups = reader.readUint32();

        const groups = [];
        const nGroups = format12.nGroups;
        // 读取字符分组
        for (i = 0; i < nGroups; ++i) {
            const group = {};
            group.start = reader.readUint32();
            group.end = reader.readUint32();
            group.startId = reader.readUint32();
            groups.push(group);
        }
        format12.groups = groups;
    }
    // format 14
    else if (subTable.format === 14) {
        const format14 = subTable;
        format14.length = reader.readUint32();
        const numVarSelectorRecords = reader.readUint32();
        const groups = [];
        for (let i = 0; i < numVarSelectorRecords; i++) {
            const varSelector = reader.readUint24();
            const defaultUVSOffset = reader.readUint32();
            const nonDefaultUVSOffset = reader.readUint32();

            if (defaultUVSOffset) {
                const numUnicodeValueRanges = reader.readUint32(startOffset + defaultUVSOffset);
                for (let j = 0; j < numUnicodeValueRanges; j++) {
                    const startUnicode = reader.readUint24();
                    const additionalCount = reader.readUint8();
                    groups.push({
                        start: startUnicode,
                        end: startUnicode + additionalCount,
                        varSelector
                    });
                }
            }
            if (nonDefaultUVSOffset) {
                const numUVSMappings = reader.readUint32(startOffset + nonDefaultUVSOffset);
                for (let j = 0; j < numUVSMappings; j++) {
                    const unicode = reader.readUint24();
                    const glyphId = reader.readUint16();
                    groups.push({
                        unicode,
                        glyphId,
                        varSelector
                    });
                }
            }
        }
        format14.groups = groups;
    }
    else {
        console.warn('not support cmap format:' + subTable.format);
    }
}


function parse$1(reader, ttf) {
    // eslint-disable-next-line no-invalid-this
    const cmapOffset = this.offset;

    reader.seek(cmapOffset);

    reader.readUint16(); // 编码方式
    const numberSubtables = reader.readUint16(); // 表个数


    const subTables = []; // 名字表
    let offset = reader.offset;

    // 使用offset读取，以便于查找
    for (let i = 0, l = numberSubtables; i < l; i++) {
        const subTable = {};
        subTable.platformID = reader.readUint16(offset);
        subTable.encodingID = reader.readUint16(offset + 2);
        subTable.offset = reader.readUint32(offset + 4);

        readSubTable(reader, ttf, subTable, cmapOffset);
        subTables.push(subTable);

        offset += 8;
    }

    const cmap = readWindowsAllCodes(subTables, ttf);

    return cmap;
}

/**
 * @file 写cmap表
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 创建`子表0`
 *
 * @param {Writer} writer 写对象
 * @param {Array} unicodes unicodes列表
 * @return {Writer}
 */
function writeSubTable0(writer, unicodes) {

    writer.writeUint16(0); // format
    writer.writeUint16(262); // length
    writer.writeUint16(0); // language

    // Array of unicodes 0..255
    let i = -1;
    let unicode;
    while ((unicode = unicodes.shift())) {
        while (++i < unicode[0]) {
            writer.writeUint8(0);
        }

        writer.writeUint8(unicode[1]);
        i = unicode[0];
    }

    while (++i < 256) {
        writer.writeUint8(0);
    }

    return writer;
}


/**
 * 创建`子表4`
 *
 * @param {Writer} writer 写对象
 * @param {Array} segments 分块编码列表
 * @return {Writer}
 */
function writeSubTable4(writer, segments) {

    writer.writeUint16(4); // format
    writer.writeUint16(24 + segments.length * 8); // length
    writer.writeUint16(0); // language

    const segCount = segments.length + 1;
    const maxExponent = Math.floor(Math.log(segCount) / Math.LN2);
    const searchRange = 2 * Math.pow(2, maxExponent);

    writer.writeUint16(segCount * 2); // segCountX2
    writer.writeUint16(searchRange); // searchRange
    writer.writeUint16(maxExponent); // entrySelector
    writer.writeUint16(2 * segCount - searchRange); // rangeShift

    // end list
    segments.forEach((segment) => {
        writer.writeUint16(segment.end);
    });
    writer.writeUint16(0xFFFF); // end code
    writer.writeUint16(0); // reservedPad


    // start list
    segments.forEach((segment) => {
        writer.writeUint16(segment.start);
    });
    writer.writeUint16(0xFFFF); // start code

    // id delta
    segments.forEach((segment) => {
        writer.writeUint16(segment.delta);
    });
    writer.writeUint16(1);

    // Array of range offsets, it doesn't matter when deltas present
    for (let i = 0, l = segments.length; i < l; i++) {
        writer.writeUint16(0);
    }
    writer.writeUint16(0); // rangeOffsetArray should be finished with 0

    return writer;
}

/**
 * 创建`子表12`
 *
 * @param {Writer} writer 写对象
 * @param {Array} segments 分块编码列表
 * @return {Writer}
 */
function writeSubTable12(writer, segments) {

    writer.writeUint16(12); // format
    writer.writeUint16(0); // reserved
    writer.writeUint32(16 + segments.length * 12); // length
    writer.writeUint32(0); // language
    writer.writeUint32(segments.length); // nGroups

    segments.forEach((segment) => {
        writer.writeUint32(segment.start);
        writer.writeUint32(segment.end);
        writer.writeUint32(segment.startId);
    });

    return writer;
}

/**
 * 写subtableheader
 *
 * @param {Writer} writer Writer对象
 * @param {number} platform 平台
 * @param {number} encoding 编码
 * @param {number} offset 偏移
 * @return {Writer}
 */
function writeSubTableHeader(writer, platform, encoding, offset) {
    writer.writeUint16(platform); // platform
    writer.writeUint16(encoding); // encoding
    writer.writeUint32(offset); // offset
    return writer;
}


/**
 * 写cmap表数据
 *
 * @param  {Object} writer 写入器
 * @param  {Object} ttf    ttf对象
 * @return {Object}        写入器
 */
function write$1(writer, ttf) {
    const hasGLyphsOver2Bytes = ttf.support.cmap.hasGLyphsOver2Bytes;

    // write table header.
    writer.writeUint16(0); // version
    writer.writeUint16(hasGLyphsOver2Bytes ? 4 : 3); // count

    // header size
    const subTableOffset = 4 + (hasGLyphsOver2Bytes ? 32 : 24);
    const format4Size = ttf.support.cmap.format4Size;
    const format0Size = ttf.support.cmap.format0Size;

    // subtable 4, unicode
    writeSubTableHeader(writer, 0, 3, subTableOffset);

    // subtable 0, mac standard
    writeSubTableHeader(writer, 1, 0, subTableOffset + format4Size);

    // subtable 4, windows standard
    writeSubTableHeader(writer, 3, 1, subTableOffset);

    if (hasGLyphsOver2Bytes) {
        writeSubTableHeader(writer, 3, 10, subTableOffset + format4Size + format0Size);
    }

    // write tables, order of table seem to be magic, it is taken from TTX tool
    writeSubTable4(writer, ttf.support.cmap.format4Segments);
    writeSubTable0(writer, ttf.support.cmap.format0Segments);

    if (hasGLyphsOver2Bytes) {
        writeSubTable12(writer, ttf.support.cmap.format12Segments);
    }

    return writer;
}

/**
 * @file 获取cmap表的大小
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 获取format4 delta值
 * Delta is saved in signed int in cmap format 4 subtable,
 * but can be in -0xFFFF..0 interval.
 * -0x10000..-0x7FFF values are stored with offset.
 *
 * @param {number} delta delta值
 * @return {number} delta值
 */
function encodeDelta(delta) {
    return delta > 0x7FFF
        ? delta - 0x10000
        : (delta < -0x7FFF ? delta + 0x10000 : delta);
}

/**
 * 根据bound获取glyf segment
 *
 * @param {Array} glyfUnicodes glyf编码集合
 * @param {number} bound 编码范围
 * @return {Array} 码表
 */
function getSegments(glyfUnicodes, bound) {

    let prevGlyph = null;
    const result = [];
    let segment = {};

    glyfUnicodes.forEach((glyph) => {

        if (bound === undefined || glyph.unicode <= bound) {
            // 初始化编码头部，这里unicode和graph id 都必须连续
            if (prevGlyph === null
                || glyph.unicode !== prevGlyph.unicode + 1
                || glyph.id !== prevGlyph.id + 1
            ) {
                if (prevGlyph !== null) {
                    segment.end = prevGlyph.unicode;
                    result.push(segment);
                    segment = {
                        start: glyph.unicode,
                        startId: glyph.id,
                        delta: encodeDelta(glyph.id - glyph.unicode)
                    };
                }
                else {
                    segment.start = glyph.unicode;
                    segment.startId = glyph.id;
                    segment.delta = encodeDelta(glyph.id - glyph.unicode);
                }
            }

            prevGlyph = glyph;
        }
    });

    // need to finish the last segment
    if (prevGlyph !== null) {
        segment.end = prevGlyph.unicode;
        result.push(segment);
    }

    // 返回编码范围
    return result;
}

/**
 * 获取format0编码集合
 *
 * @param {Array} glyfUnicodes glyf编码集合
 * @return {Array} 码表
 */
function getFormat0Segment(glyfUnicodes) {
    const unicodes = [];
    glyfUnicodes.forEach((u) => {
        if (u.unicode !== undefined && u.unicode < 256) {
            unicodes.push([u.unicode, u.id]);
        }
    });

    // 按编码排序
    unicodes.sort((a, b) => a[0] - b[0]);

    return unicodes;
}

/**
 * 对cmap数据进行预处理，获取大小
 *
 * @param  {Object} ttf ttf对象
 * @return {number} 大小
 */
function sizeof$1(ttf) {
    ttf.support.cmap = {};
    let glyfUnicodes = [];
    ttf.glyf.forEach((glyph, index) => {

        let unicodes = glyph.unicode;

        if (typeof glyph.unicode === 'number') {
            unicodes = [glyph.unicode];
        }

        if (unicodes && unicodes.length) {
            unicodes.forEach((unicode) => {
                glyfUnicodes.push({
                    unicode,
                    id: unicode !== 0xFFFF ? index : 0
                });
            });
        }

    });

    glyfUnicodes = glyfUnicodes.sort((a, b) => a.unicode - b.unicode);

    ttf.support.cmap.unicodes = glyfUnicodes;

    const unicodes2Bytes = glyfUnicodes;

    ttf.support.cmap.format4Segments = getSegments(unicodes2Bytes, 0xFFFF);
    ttf.support.cmap.format4Size = 24
        + ttf.support.cmap.format4Segments.length * 8;

    ttf.support.cmap.format0Segments = getFormat0Segment(glyfUnicodes);
    ttf.support.cmap.format0Size = 262;

    // we need subtable 12 only if found unicodes with > 2 bytes.
    const hasGLyphsOver2Bytes = unicodes2Bytes.some((glyph) => glyph.unicode > 0xFFFF);

    if (hasGLyphsOver2Bytes) {
        ttf.support.cmap.hasGLyphsOver2Bytes = hasGLyphsOver2Bytes;

        const unicodes4Bytes = glyfUnicodes;

        ttf.support.cmap.format12Segments = getSegments(unicodes4Bytes);
        ttf.support.cmap.format12Size = 16
            + ttf.support.cmap.format12Segments.length * 12;
    }

    const size = 4 + (hasGLyphsOver2Bytes ? 32 : 24) // cmap header
        + ttf.support.cmap.format0Size // format 0
        + ttf.support.cmap.format4Size // format 4
        + (hasGLyphsOver2Bytes ? ttf.support.cmap.format12Size : 0); // format 12

    return size;
}

/**
 * @file cmap 表
 * @author mengke01(kekee000@gmail.com)
 *
 * @see
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cmap.html
 */

var cmap = table.create(
    'cmap',
    [],
    {
        write: write$1,
        read: parse$1,
        size: sizeof$1
    }
);

/**
 * @file ttf `name`编码表
 * @author mengke01(kekee000@gmail.com)
 */

const nameId = {
    0: 'copyright',
    1: 'fontFamily',
    2: 'fontSubFamily',
    3: 'uniqueSubFamily',
    4: 'fullName',
    5: 'version',
    6: 'postScriptName',
    7: 'tradeMark',
    8: 'manufacturer',
    9: 'designer',
    10: 'description',
    11: 'urlOfFontVendor',
    12: 'urlOfFontDesigner',
    13: 'licence',
    14: 'urlOfLicence',
    16: 'preferredFamily',
    17: 'preferredSubFamily',
    18: 'compatibleFull',
    19: 'sampleText'
};

// 反转names
const nameIdHash = {};
Object.keys(nameId).forEach(id => {
    nameIdHash[nameId[id]] = +id;
});

nameId.names = nameIdHash;

/**
 * @file 字体所属平台
 * @author mengke01(kekee000@gmail.com)
 */

var platformTbl = {
    Unicode: 0,
    Macintosh: 1, // mac
    reserved: 2,
    Microsoft: 3 // win
};

/**
 * @file Unicode Platform-specific Encoding Identifiers
 * @author mengke01(kekee000@gmail.com)
 */
// mac encoding id
const mac = {
    'Default': 0, // default use
    'Version1.1': 1,
    'ISO10646': 2,
    'UnicodeBMP': 3,
    'UnicodenonBMP': 4,
    'UnicodeVariationSequences': 5,
    'FullUnicodecoverage': 6
};

// windows encoding id
const win = {
    Symbol: 0,
    UCS2: 1, // default use
    ShiftJIS: 2,
    PRC: 3,
    BigFive: 4,
    Johab: 5,
    UCS4: 6
};

/**
 * @file name表
 * @author mengke01(kekee000@gmail.com)
 */

var NameTbl = table.create(
    'name',
    [],
    {

        read(reader) {
            let offset = this.offset;
            reader.seek(offset);

            const nameTbl = {};
            nameTbl.format = reader.readUint16();
            nameTbl.count = reader.readUint16();
            nameTbl.stringOffset = reader.readUint16();

            const nameRecordTbl = [];
            const count = nameTbl.count;
            let i;
            let nameRecord;

            for (i = 0; i < count; ++i) {
                nameRecord = {};
                nameRecord.platform = reader.readUint16();
                nameRecord.encoding = reader.readUint16();
                nameRecord.language = reader.readUint16();
                nameRecord.nameId = reader.readUint16();
                nameRecord.length = reader.readUint16();
                nameRecord.offset = reader.readUint16();
                nameRecordTbl.push(nameRecord);
            }

            offset += nameTbl.stringOffset;

            // 读取字符名字
            for (i = 0; i < count; ++i) {
                nameRecord = nameRecordTbl[i];
                nameRecord.name = reader.readBytes(offset + nameRecord.offset, nameRecord.length);
            }

            const names = {};

            // mac 下的english name
            let platform = platformTbl.Macintosh;
            let encoding = mac.Default;
            let language = 0;

            // 如果有windows 下的 english，则用windows下的 name
            if (nameRecordTbl.some((record) => record.platform === platformTbl.Microsoft
                    && record.encoding === win.UCS2
                    && record.language === 1033)) {
                platform = platformTbl.Microsoft;
                encoding = win.UCS2;
                language = 1033;
            }

            for (i = 0; i < count; ++i) {
                nameRecord = nameRecordTbl[i];
                if (nameRecord.platform === platform
                    && nameRecord.encoding === encoding
                    && nameRecord.language === language
                    && nameId[nameRecord.nameId]) {
                    names[nameId[nameRecord.nameId]] = language === 0
                        ? utilString.getUTF8String(nameRecord.name)
                        : utilString.getUCS2String(nameRecord.name);
                }
            }

            return names;
        },

        write(writer, ttf) {
            const nameRecordTbl = ttf.support.name;

            writer.writeUint16(0); // format
            writer.writeUint16(nameRecordTbl.length); // count
            writer.writeUint16(6 + nameRecordTbl.length * 12); // string offset

            // write name tbl header
            let offset = 0;
            nameRecordTbl.forEach((nameRecord) => {
                writer.writeUint16(nameRecord.platform);
                writer.writeUint16(nameRecord.encoding);
                writer.writeUint16(nameRecord.language);
                writer.writeUint16(nameRecord.nameId);
                writer.writeUint16(nameRecord.name.length);
                writer.writeUint16(offset); // offset
                offset += nameRecord.name.length;
            });

            // write name tbl strings
            nameRecordTbl.forEach((nameRecord) => {
                writer.writeBytes(nameRecord.name);
            });

            return writer;
        },

        size(ttf) {
            const names = ttf.name;
            let nameRecordTbl = [];

            // 写入name信息
            // 这里为了简化书写，仅支持英文编码字符，
            // 中文编码字符将被转化成url encode
            let size = 6;
            Object.keys(names).forEach((name) => {
                const id = nameId.names[name];

                const utf8Bytes = utilString.toUTF8Bytes(names[name]);
                const usc2Bytes = utilString.toUCS2Bytes(names[name]);

                if (undefined !== id) {
                    // mac
                    nameRecordTbl.push({
                        nameId: id,
                        platform: 1,
                        encoding: 0,
                        language: 0,
                        name: utf8Bytes
                    });

                    // windows
                    nameRecordTbl.push({
                        nameId: id,
                        platform: 3,
                        encoding: 1,
                        language: 1033,
                        name: usc2Bytes
                    });

                    // 子表大小
                    size += 12 * 2 + utf8Bytes.length + usc2Bytes.length;
                }
            });

            const namingOrder = ['platform', 'encoding', 'language', 'nameId'];
            nameRecordTbl = nameRecordTbl.sort((a, b) => {
                let l = 0;
                namingOrder.some(name => {
                    const o = a[name] - b[name];
                    if (o) {
                        l = o;
                        return true;
                    }
                    return false;
                });
                return l;
            });

            // 保存预处理信息
            ttf.support.name = nameRecordTbl;

            return size;
        }
    }
);

/**
 * @file hhea 表
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6hhea.html
 */
var hhea = table.create(
    'hhea',
    [
        ['version', struct.Fixed],
        ['ascent', struct.Int16],
        ['descent', struct.Int16],
        ['lineGap', struct.Int16],
        ['advanceWidthMax', struct.Uint16],
        ['minLeftSideBearing', struct.Int16],
        ['minRightSideBearing', struct.Int16],
        ['xMaxExtent', struct.Int16],
        ['caretSlopeRise', struct.Int16],
        ['caretSlopeRun', struct.Int16],
        ['caretOffset', struct.Int16],
        ['reserved0', struct.Int16],
        ['reserved1', struct.Int16],
        ['reserved2', struct.Int16],
        ['reserved3', struct.Int16],
        ['metricDataFormat', struct.Int16],
        ['numOfLongHorMetrics', struct.Uint16]
    ]
);

/**
 * @file hmtx 表
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6hmtx.html
 */

var hmtx = table.create(
    'hmtx',
    [],
    {

        read(reader, ttf) {
            const offset = this.offset;
            reader.seek(offset);

            const numOfLongHorMetrics = ttf.hhea.numOfLongHorMetrics;
            const hMetrics = [];
            let i;
            let hMetric;
            for (i = 0; i < numOfLongHorMetrics; ++i) {
                hMetric = {};
                hMetric.advanceWidth = reader.readUint16();
                hMetric.leftSideBearing = reader.readInt16();
                hMetrics.push(hMetric);
            }

            // 最后一个宽度
            const advanceWidth = hMetrics[numOfLongHorMetrics - 1].advanceWidth;
            const numOfLast = ttf.maxp.numGlyphs - numOfLongHorMetrics;

            // 获取后续的hmetrics
            for (i = 0; i < numOfLast; ++i) {
                hMetric = {};
                hMetric.advanceWidth = advanceWidth;
                hMetric.leftSideBearing = reader.readInt16();
                hMetrics.push(hMetric);
            }

            return hMetrics;

        },

        write(writer, ttf) {
            let i;
            const numOfLongHorMetrics = ttf.hhea.numOfLongHorMetrics;
            for (i = 0; i < numOfLongHorMetrics; ++i) {
                writer.writeUint16(ttf.glyf[i].advanceWidth);
                writer.writeInt16(ttf.glyf[i].leftSideBearing);
            }

            // 最后一个宽度
            const numOfLast = ttf.glyf.length - numOfLongHorMetrics;

            for (i = 0; i < numOfLast; ++i) {
                writer.writeInt16(ttf.glyf[numOfLongHorMetrics + i].leftSideBearing);
            }

            return writer;
        },

        size(ttf) {

            // 计算同最后一个advanceWidth相等的元素个数
            let numOfLast = 0;
            // 最后一个advanceWidth
            const advanceWidth = ttf.glyf[ttf.glyf.length - 1].advanceWidth;

            for (let i = ttf.glyf.length - 2; i >= 0; i--) {
                if (advanceWidth === ttf.glyf[i].advanceWidth) {
                    numOfLast++;
                }
                else {
                    break;
                }
            }

            ttf.hhea.numOfLongHorMetrics = ttf.glyf.length - numOfLast;

            return 4 * ttf.hhea.numOfLongHorMetrics + 2 * numOfLast;
        }
    }
);

/**
 * @file post 表
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6post.html
 */

const Posthead = table.create(
    'posthead',
    [
        ['format', struct.Fixed],
        ['italicAngle', struct.Fixed],
        ['underlinePosition', struct.Int16],
        ['underlineThickness', struct.Int16],
        ['isFixedPitch', struct.Uint32],
        ['minMemType42', struct.Uint32],
        ['maxMemType42', struct.Uint32],
        ['minMemType1', struct.Uint32],
        ['maxMemType1', struct.Uint32]
    ]
);

var post = table.create(
    'post',
    [],
    {

        read(reader, ttf) {
            const format = reader.readFixed(this.offset);
            // 读取表头
            const tbl = new Posthead(this.offset).read(reader, ttf);

            // format2
            if (format === 2) {
                const numberOfGlyphs = reader.readUint16();
                const glyphNameIndex = [];

                for (let i = 0; i < numberOfGlyphs; ++i) {
                    glyphNameIndex.push(reader.readUint16());
                }

                const pascalStringOffset = reader.offset;
                const pascalStringLength = ttf.tables.post.length - (pascalStringOffset - this.offset);
                const pascalStringBytes = reader.readBytes(reader.offset, pascalStringLength);

                tbl.nameIndex = glyphNameIndex; // 设置glyf名字索引
                tbl.names = utilString.getPascalString(pascalStringBytes); // glyf名字数组
            }
            // deprecated
            else if (format === 2.5) {
                tbl.format = 3;
            }

            return tbl;
        },

        write(writer, ttf) {


            const post = ttf.post || {
                format: 3
            };

            // write header
            writer.writeFixed(post.format); // format
            writer.writeFixed(post.italicAngle || 0); // italicAngle
            writer.writeInt16(post.underlinePosition || 0); // underlinePosition
            writer.writeInt16(post.underlineThickness || 0); // underlineThickness
            writer.writeUint32(post.isFixedPitch || 0); // isFixedPitch
            writer.writeUint32(post.minMemType42 || 0); // minMemType42
            writer.writeUint32(post.maxMemType42 || 0); // maxMemType42
            writer.writeUint32(post.minMemType1 || 0); // minMemType1
            writer.writeUint32(post.maxMemType1 || 0); // maxMemType1

            // version 3 不设置post信息
            if (post.format === 2) {
                const numberOfGlyphs = ttf.glyf.length;
                writer.writeUint16(numberOfGlyphs); // numberOfGlyphs
                // write glyphNameIndex
                const nameIndex = ttf.support.post.nameIndex;
                for (let i = 0, l = nameIndex.length; i < l; i++) {
                    writer.writeUint16(nameIndex[i]);
                }

                // write names
                ttf.support.post.names.forEach((name) => {
                    writer.writeBytes(name);
                });
            }
        },

        size(ttf) {

            const numberOfGlyphs = ttf.glyf.length;
            ttf.post = ttf.post || {};
            ttf.post.format = ttf.post.format || 3;
            ttf.post.maxMemType1 = numberOfGlyphs;

            // version 3 不设置post信息
            if (ttf.post.format === 3 || ttf.post.format === 1) {
                return 32;
            }

            // version 2
            let size = 34 + numberOfGlyphs * 2; // header + numberOfGlyphs + numberOfGlyphs * 2
            const glyphNames = [];
            const nameIndexArr = [];
            let nameIndex = 0;

            // 获取 name的大小
            for (let i = 0; i < numberOfGlyphs; i++) {
                // .notdef
                if (i === 0) {
                    nameIndexArr.push(0);
                }
                else {
                    const glyf = ttf.glyf[i];
                    const unicode = glyf.unicode ? glyf.unicode[0] : 0;
                    const unicodeNameIndex = unicodeName[unicode];
                    if (undefined !== unicodeNameIndex) {
                        nameIndexArr.push(unicodeNameIndex);
                    }
                    else {
                        // 这里需要注意，"" 有可能是"\3" length不为0，但是是空字符串
                        const name = glyf.name;
                        if (!name || name.charCodeAt(0) < 32) {
                            nameIndexArr.push(258 + nameIndex++);
                            glyphNames.push([0]);
                            size++;
                        }
                        else {
                            nameIndexArr.push(258 + nameIndex++);
                            const bytes = utilString.toPascalStringBytes(name); // pascal string bytes
                            glyphNames.push(bytes);
                            size += bytes.length;
                        }
                    }
                }
            }

            ttf.support.post = {
                nameIndex: nameIndexArr,
                names: glyphNames
            };

            return size;
        }
    }
);

/**
 * @file OS/2表
 * @author mengke01(kekee000@gmail.com)
 *
 * http://www.microsoft.com/typography/otspec/os2.htm
 */

var OS2 = table.create(
    'OS/2',
    [
        ['version', struct.Uint16],

        ['xAvgCharWidth', struct.Int16],
        ['usWeightClass', struct.Uint16],
        ['usWidthClass', struct.Uint16],

        ['fsType', struct.Uint16],

        ['ySubscriptXSize', struct.Uint16],
        ['ySubscriptYSize', struct.Uint16],
        ['ySubscriptXOffset', struct.Uint16],
        ['ySubscriptYOffset', struct.Uint16],

        ['ySuperscriptXSize', struct.Uint16],
        ['ySuperscriptYSize', struct.Uint16],
        ['ySuperscriptXOffset', struct.Uint16],
        ['ySuperscriptYOffset', struct.Uint16],

        ['yStrikeoutSize', struct.Uint16],
        ['yStrikeoutPosition', struct.Uint16],

        ['sFamilyClass', struct.Uint16],

        // Panose
        ['bFamilyType', struct.Uint8],
        ['bSerifStyle', struct.Uint8],
        ['bWeight', struct.Uint8],
        ['bProportion', struct.Uint8],
        ['bContrast', struct.Uint8],
        ['bStrokeVariation', struct.Uint8],
        ['bArmStyle', struct.Uint8],
        ['bLetterform', struct.Uint8],
        ['bMidline', struct.Uint8],
        ['bXHeight', struct.Uint8],

        // unicode range
        ['ulUnicodeRange1', struct.Uint32],
        ['ulUnicodeRange2', struct.Uint32],
        ['ulUnicodeRange3', struct.Uint32],
        ['ulUnicodeRange4', struct.Uint32],

        // char 4
        ['achVendID', struct.String, 4],

        ['fsSelection', struct.Uint16],
        ['usFirstCharIndex', struct.Uint16],
        ['usLastCharIndex', struct.Uint16],

        ['sTypoAscender', struct.Int16],
        ['sTypoDescender', struct.Int16],
        ['sTypoLineGap', struct.Int16],

        ['usWinAscent', struct.Uint16],
        ['usWinDescent', struct.Uint16],
        // version 0 above 39

        ['ulCodePageRange1', struct.Uint32],
        ['ulCodePageRange2', struct.Uint32],
        // version 1 above 41

        ['sxHeight', struct.Int16],
        ['sCapHeight', struct.Int16],

        ['usDefaultChar', struct.Uint16],
        ['usBreakChar', struct.Uint16],
        ['usMaxContext', struct.Uint16]
        // version 2,3,4 above 46
    ],
    {

        read(reader, ttf) {
            const format = reader.readUint16(this.offset);
            let struct = this.struct;

            // format2
            if (format === 0) {
                struct = struct.slice(0, 39);
            }
            else if (format === 1) {
                struct = struct.slice(0, 41);
            }

            const OS2Head = table.create('os2head', struct);
            const tbl = new OS2Head(this.offset).read(reader, ttf);

            // 补齐其他version的字段
            const os2Fields = {
                ulCodePageRange1: 1,
                ulCodePageRange2: 0,
                sxHeight: 0,
                sCapHeight: 0,
                usDefaultChar: 0,
                usBreakChar: 32,
                usMaxContext: 0
            };

            return Object.assign(os2Fields, tbl);
        },

        size(ttf) {

            // 更新其他表的统计信息
            // header
            let xMin = 16384;
            let yMin = 16384;
            let xMax = -16384;
            let yMax = -16384;

            // hhea
            let advanceWidthMax = -1;
            let minLeftSideBearing = 16384;
            let minRightSideBearing = 16384;
            let xMaxExtent = -16384;

            // os2 count
            let xAvgCharWidth = 0;
            let usFirstCharIndex = 0x10FFFF;
            let usLastCharIndex = -1;

            // maxp
            let maxPoints = 0;
            let maxContours = 0;
            let maxCompositePoints = 0;
            let maxCompositeContours = 0;
            let maxSizeOfInstructions = 0;
            let maxComponentElements = 0;

            let glyfNotEmpty = 0; // 非空glyf
            const hinting = ttf.writeOptions ? ttf.writeOptions.hinting : false;

            // 计算instructions和functiondefs
            if (hinting) {

                if (ttf.cvt) {
                    maxSizeOfInstructions = Math.max(maxSizeOfInstructions, ttf.cvt.length);
                }

                if (ttf.prep) {
                    maxSizeOfInstructions = Math.max(maxSizeOfInstructions, ttf.prep.length);
                }

                if (ttf.fpgm) {
                    maxSizeOfInstructions = Math.max(maxSizeOfInstructions, ttf.fpgm.length);
                }

            }


            ttf.glyf.forEach((glyf) => {

                // 统计control point信息
                if (glyf.compound) {
                    let compositeContours = 0;
                    let compositePoints = 0;
                    glyf.glyfs.forEach((g) => {
                        const cglyf = ttf.glyf[g.glyphIndex];
                        if (!cglyf) {
                            return;
                        }
                        compositeContours += cglyf.contours ? cglyf.contours.length : 0;
                        if (cglyf.contours && cglyf.contours.length) {
                            cglyf.contours.forEach((contour) => {
                                compositePoints += contour.length;
                            });
                        }
                    });

                    maxComponentElements++;
                    maxCompositePoints = Math.max(maxCompositePoints, compositePoints);
                    maxCompositeContours = Math.max(maxCompositeContours, compositeContours);
                }
                // 简单图元
                else if (glyf.contours && glyf.contours.length) {
                    maxContours = Math.max(maxContours, glyf.contours.length);

                    let points = 0;
                    glyf.contours.forEach((contour) => {
                        points += contour.length;
                    });
                    maxPoints = Math.max(maxPoints, points);
                }

                if (hinting && glyf.instructions) {
                    maxSizeOfInstructions = Math.max(maxSizeOfInstructions, glyf.instructions.length);
                }

                // 统计边界信息
                if (glyf.xMin < xMin) {
                    xMin = glyf.xMin;
                }

                if (glyf.yMin < yMin) {
                    yMin = glyf.yMin;
                }

                if (glyf.xMax > xMax) {
                    xMax = glyf.xMax;
                }

                if (glyf.yMax > yMax) {
                    yMax = glyf.yMax;
                }

                advanceWidthMax = Math.max(advanceWidthMax, glyf.advanceWidth);
                minLeftSideBearing = Math.min(minLeftSideBearing, glyf.leftSideBearing);
                minRightSideBearing = Math.min(minRightSideBearing, glyf.advanceWidth - glyf.xMax);
                xMaxExtent = Math.max(xMaxExtent, glyf.xMax);

                xAvgCharWidth += glyf.advanceWidth;

                glyfNotEmpty++;

                let unicodes = glyf.unicode;

                if (typeof glyf.unicode === 'number') {
                    unicodes = [glyf.unicode];
                }

                if (Array.isArray(unicodes)) {
                    unicodes.forEach((unicode) => {
                        if (unicode !== 0xFFFF) {
                            usFirstCharIndex = Math.min(usFirstCharIndex, unicode);
                            usLastCharIndex = Math.max(usLastCharIndex, unicode);
                        }
                    });
                }
            });

            // 重新设置version 4
            ttf['OS/2'].version = 0x4;
            ttf['OS/2'].achVendID = (ttf['OS/2'].achVendID + '    ').slice(0, 4);
            ttf['OS/2'].xAvgCharWidth = xAvgCharWidth / (glyfNotEmpty || 1);
            ttf['OS/2'].ulUnicodeRange2 = 268435456;
            ttf['OS/2'].usFirstCharIndex = usFirstCharIndex;
            ttf['OS/2'].usLastCharIndex = usLastCharIndex;

            // rewrite hhea
            ttf.hhea.version = ttf.hhea.version || 0x1;
            ttf.hhea.advanceWidthMax = advanceWidthMax;
            ttf.hhea.minLeftSideBearing = minLeftSideBearing;
            ttf.hhea.minRightSideBearing = minRightSideBearing;
            ttf.hhea.xMaxExtent = xMaxExtent;

            // rewrite head
            ttf.head.version = ttf.head.version || 0x1;
            ttf.head.lowestRecPPEM = ttf.head.lowestRecPPEM || 0x8;
            ttf.head.xMin = xMin;
            ttf.head.yMin = yMin;
            ttf.head.xMax = xMax;
            ttf.head.yMax = yMax;

            // head rewrite
            if (ttf.support.head) {
                const {xMin, yMin, xMax, yMax} = ttf.support.head;
                if (xMin != null) {
                    ttf.head.xMin = xMin;
                }
                if (yMin != null) {
                    ttf.head.yMin = yMin;
                }
                if (xMax != null) {
                    ttf.head.xMax = xMax;
                }
                if (yMax != null) {
                    ttf.head.yMax = yMax;
                }

            }
            // hhea rewrite
            if (ttf.support.hhea) {
                const {advanceWidthMax, xMaxExtent, minLeftSideBearing, minRightSideBearing} = ttf.support.hhea;
                if (advanceWidthMax != null) {
                    ttf.hhea.advanceWidthMax = advanceWidthMax;
                }
                if (xMaxExtent != null) {
                    ttf.hhea.xMaxExtent = xMaxExtent;
                }
                if (minLeftSideBearing != null) {
                    ttf.hhea.minLeftSideBearing = minLeftSideBearing;
                }
                if (minRightSideBearing != null) {
                    ttf.hhea.minRightSideBearing = minRightSideBearing;
                }
            }
            // 这里根据存储的maxp来设置新的maxp，避免重复计算maxp
            ttf.maxp = ttf.maxp || {};
            ttf.support.maxp = {
                version: 1.0,
                numGlyphs: ttf.glyf.length,
                maxPoints,
                maxContours,
                maxCompositePoints,
                maxCompositeContours,
                maxZones: ttf.maxp.maxZones || 0,
                maxTwilightPoints: ttf.maxp.maxTwilightPoints || 0,
                maxStorage: ttf.maxp.maxStorage || 0,
                maxFunctionDefs: ttf.maxp.maxFunctionDefs || 0,
                maxStackElements: ttf.maxp.maxStackElements || 0,
                maxSizeOfInstructions,
                maxComponentElements,
                maxComponentDepth: maxComponentElements ? 1 : 0
            };

            return table.size.call(this, ttf);
        }
    }
);

/**
 * @file cff名字设置
 * @author mengke01(kekee000@gmail.com)
 */


const cffStandardEncoding = [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
    'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen',
    'period', 'slash', 'zero', 'one', 'two',
    'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
    'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F',
    'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
    'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft',
    'backslash', 'bracketright', 'asciicircum', 'underscore',
    'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g',
    'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar',
    'braceright', 'asciitilde', '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'exclamdown', 'cent', 'sterling', 'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle',
    'quotedblleft', 'guillemotleft', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', '', 'endash', 'dagger',
    'daggerdbl', 'periodcentered', '', 'paragraph', 'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright',
    'guillemotright', 'ellipsis', 'perthousand', '',
    'questiondown', '', 'grave', 'acute', 'circumflex', 'tilde',
    'macron', 'breve', 'dotaccent', 'dieresis', '',
    'ring', 'cedilla', '', 'hungarumlaut', 'ogonek', 'caron',
    'emdash', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'AE', '', 'ordfeminine', '', '', '',
    '', 'Lslash', 'Oslash', 'OE', 'ordmasculine', '', '', '', '', '', 'ae', '', '', '', 'dotlessi', '', '',
    'lslash', 'oslash', 'oe', 'germandbls'
];

const cffExpertEncoding = [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', 'space', 'exclamsmall', 'Hungarumlautsmall', '', 'dollaroldstyle', 'dollarsuperior',
    'ampersandsmall', 'Acutesmall', 'parenleftsuperior',
    'parenrightsuperior', 'twodotenleader', 'onedotenleader',
    'comma', 'hyphen', 'period', 'fraction', 'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle',
    'fouroldstyle', 'fiveoldstyle', 'sixoldstyle', 'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'colon',
    'semicolon', 'commasuperior', 'threequartersemdash', 'periodsuperior', 'questionsmall', '', 'asuperior',
    'bsuperior', 'centsuperior', 'dsuperior', 'esuperior',
    '', '', 'isuperior', '', '', 'lsuperior', 'msuperior',
    'nsuperior', 'osuperior', '', '', 'rsuperior', 'ssuperior', 'tsuperior', '', 'ff', 'fi', 'fl', 'ffi', 'ffl',
    'parenleftinferior', '', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
    'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall',
    'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
    'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall',
    'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
    'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall',
    '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'exclamdownsmall', 'centoldstyle', 'Lslashsmall', '', '', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall',
    'Brevesmall', 'Caronsmall', '', 'Dotaccentsmall', '', '',
    'Macronsmall', '', '', 'figuredash', 'hypheninferior',
    '', '', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall', '', '', '', 'onequarter', 'onehalf', 'threequarters',
    'questiondownsmall', 'oneeighth', 'threeeighths',
    'fiveeighths', 'seveneighths', 'onethird', 'twothirds', '',
    '', 'zerosuperior', 'onesuperior', 'twosuperior', 'threesuperior', 'foursuperior', 'fivesuperior',
    'sixsuperior', 'sevensuperior', 'eightsuperior',
    'ninesuperior', 'zeroinferior', 'oneinferior', 'twoinferior',
    'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior', 'seveninferior', 'eightinferior',
    'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior', 'commainferior', 'Agravesmall',
    'Aacutesmall', 'Acircumflexsmall', 'Atildesmall',
    'Adieresissmall', 'Aringsmall', 'AEsmall', 'Ccedillasmall',
    'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall', 'Igravesmall', 'Iacutesmall',
    'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall', 'Oacutesmall',
    'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall',
    'OEsmall', 'Oslashsmall', 'Ugravesmall', 'Uacutesmall',
    'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall'
];



var encoding = {
    standardEncoding: cffStandardEncoding,
    expertEncoding: cffExpertEncoding
};

/**
 * @file cffStandardStrings.js
 * @author mengke01(kekee000@gmail.com)
 */
const cffStandardStrings = [
    '.notdef', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
    'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two',
    'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
    'question', 'at', 'A', 'B', 'C', 'D', 'E',
    'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
    'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore',
    'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright',
    'asciitilde', 'exclamdown', 'cent', 'sterling',
    'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle', 'quotedblleft', 'guillemotleft',
    'guilsinglleft', 'guilsinglright', 'fi', 'fl', 'endash', 'dagger',
    'daggerdbl', 'periodcentered', 'paragraph',
    'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright', 'guillemotright', 'ellipsis', 'perthousand',
    'questiondown', 'grave', 'acute', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'dieresis', 'ring',
    'cedilla', 'hungarumlaut', 'ogonek', 'caron', 'emdash', 'AE', 'ordfeminine', 'Lslash', 'Oslash', 'OE',
    'ordmasculine', 'ae', 'dotlessi', 'lslash', 'oslash', 'oe', 'germandbls', 'onesuperior', 'logicalnot', 'mu',
    'trademark', 'Eth', 'onehalf', 'plusminus', 'Thorn', 'onequarter', 'divide', 'brokenbar', 'degree', 'thorn',
    'threequarters', 'twosuperior', 'registered', 'minus', 'eth', 'multiply', 'threesuperior', 'copyright',
    'Aacute', 'Acircumflex', 'Adieresis', 'Agrave', 'Aring', 'Atilde', 'Ccedilla', 'Eacute', 'Ecircumflex',
    'Edieresis', 'Egrave', 'Iacute', 'Icircumflex', 'Idieresis', 'Igrave', 'Ntilde', 'Oacute', 'Ocircumflex',
    'Odieresis', 'Ograve', 'Otilde', 'Scaron', 'Uacute', 'Ucircumflex', 'Udieresis', 'Ugrave', 'Yacute',
    'Ydieresis', 'Zcaron', 'aacute', 'acircumflex', 'adieresis',
    'agrave', 'aring', 'atilde', 'ccedilla', 'eacute',
    'ecircumflex', 'edieresis', 'egrave', 'iacute', 'icircumflex', 'idieresis', 'igrave', 'ntilde', 'oacute',
    'ocircumflex', 'odieresis', 'ograve', 'otilde', 'scaron', 'uacute', 'ucircumflex', 'udieresis', 'ugrave',
    'yacute', 'ydieresis', 'zcaron', 'exclamsmall', 'Hungarumlautsmall', 'dollaroldstyle', 'dollarsuperior',
    'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', '266 ff', 'onedotenleader',
    'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle',
    'fouroldstyle', 'fiveoldstyle', 'sixoldstyle',
    'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'commasuperior', 'threequartersemdash', 'periodsuperior',
    'questionsmall', 'asuperior', 'bsuperior', 'centsuperior',
    'dsuperior', 'esuperior', 'isuperior', 'lsuperior',
    'msuperior', 'nsuperior', 'osuperior', 'rsuperior', 'ssuperior', 'tsuperior', 'ff', 'ffi', 'ffl',
    'parenleftinferior', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
    'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall',
    'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
    'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall',
    'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
    'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', 'exclamdownsmall',
    'centoldstyle', 'Lslashsmall', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall', 'Brevesmall', 'Caronsmall',
    'Dotaccentsmall', 'Macronsmall', 'figuredash', 'hypheninferior', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall',
    'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds',
    'zerosuperior', 'foursuperior', 'fivesuperior', 'sixsuperior',
    'sevensuperior', 'eightsuperior', 'ninesuperior',
    'zeroinferior', 'oneinferior', 'twoinferior', 'threeinferior',
    'fourinferior', 'fiveinferior', 'sixinferior',
    'seveninferior', 'eightinferior', 'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior',
    'commainferior', 'Agravesmall', 'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall',
    'Aringsmall', 'AEsmall', 'Ccedillasmall', 'Egravesmall',
    'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall',
    'Igravesmall', 'Iacutesmall', 'Icircumflexsmall',
    'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall',
    'Oacutesmall', 'Ocircumflexsmall', 'Otildesmall',
    'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall',
    'Uacutesmall', 'Ucircumflexsmall', 'Udieresissmall',
    'Yacutesmall', 'Thornsmall', 'Ydieresissmall', '001.000',
    '001.001', '001.002', '001.003', 'Black', 'Bold',
    'Book', 'Light', 'Medium', 'Regular', 'Roman', 'Semibold'
];

/**
 * @file 获取cff字符串
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 根据索引获取cff字符串
 *
 * @param  {Object} strings 标准cff字符串索引
 * @param  {number} index   索引号
 * @return {number}         字符串索引
 */
function getCFFString(strings, index) {
    if (index <= 390) {
        index = cffStandardStrings[index];
    }
    // Strings below index 392 are standard CFF strings and are not encoded in the font.
    else {
        index = strings[index - 391];
    }

    return index;
}

/**
 * @file 解析cffdict数据
 * @author mengke01(kekee000@gmail.com)
 */

const TOP_DICT_META = [
    {
        name: 'version',
        op: 0,
        type: 'SID'
    },
    {
        name: 'notice',
        op: 1,
        type: 'SID'
    },
    {
        name: 'copyright',
        op: 1200,
        type: 'SID'
    },
    {
        name: 'fullName',
        op: 2,
        type: 'SID'
    },
    {
        name: 'familyName',
        op: 3,
        type: 'SID'
    },
    {
        name: 'weight',
        op: 4,
        type: 'SID'
    },
    {
        name: 'isFixedPitch',
        op: 1201,
        type: 'number',
        value: 0
    },
    {
        name: 'italicAngle',
        op: 1202,
        type: 'number',
        value: 0
    },
    {
        name: 'underlinePosition',
        op: 1203,
        type: 'number',
        value: -100
    },
    {
        name: 'underlineThickness',
        op: 1204,
        type: 'number',
        value: 50
    },
    {
        name: 'paintType',
        op: 1205,
        type: 'number',
        value: 0
    },
    {
        name: 'charstringType',
        op: 1206,
        type: 'number',
        value: 2
    },
    {
        name: 'fontMatrix',
        op: 1207,
        type: ['real', 'real', 'real', 'real', 'real', 'real'],
        value: [0.001, 0, 0, 0.001, 0, 0]
    },
    {
        name: 'uniqueId',
        op: 13,
        type: 'number'
    },
    {
        name: 'fontBBox',
        op: 5,
        type: ['number', 'number', 'number', 'number'],
        value: [0, 0, 0, 0]
    },
    {
        name: 'strokeWidth',
        op: 1208,
        type: 'number',
        value: 0
    },
    {
        name: 'xuid',
        op: 14,
        type: [],
        value: null
    },
    {
        name: 'charset',
        op: 15,
        type: 'offset',
        value: 0
    },
    {
        name: 'encoding',
        op: 16,
        type: 'offset',
        value: 0
    },
    {
        name: 'charStrings',
        op: 17,
        type: 'offset',
        value: 0
    },
    {
        name: 'private',
        op: 18,
        type: ['number', 'offset'],
        value: [0, 0]
    }
];

const PRIVATE_DICT_META = [
    {
        name: 'subrs',
        op: 19,
        type: 'offset',
        value: 0
    },
    {
        name: 'defaultWidthX',
        op: 20,
        type: 'number',
        value: 0
    },
    {
        name: 'nominalWidthX',
        op: 21,
        type: 'number',
        value: 0
    }
];

function entriesToObject(entries) {
    const hash = {};

    for (let i = 0, l = entries.length; i < l; i++) {
        const key = entries[i][0];
        if (undefined !== hash[key]) {
            console.warn('dict already has key:' + key);
            continue;
        }

        const values = entries[i][1];
        hash[key] = values.length === 1 ? values[0] : values;
    }

    return hash;
}


/* eslint-disable no-constant-condition */
function parseFloatOperand(reader) {
    let s = '';
    const eof = 15;
    const lookup = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'E', 'E-', null, '-'];

    while (true) {
        const b = reader.readUint8();
        const n1 = b >> 4;
        const n2 = b & 15;

        if (n1 === eof) {
            break;
        }

        s += lookup[n1];

        if (n2 === eof) {
            break;
        }

        s += lookup[n2];
    }

    return parseFloat(s);
}
/* eslint-enable no-constant-condition */

/**
 * 解析cff字典数据
 *
 * @param  {Reader} reader 读取器
 * @param  {number} b0     操作码
 * @return {number}        数据
 */
function parseOperand(reader, b0) {
    let b1;
    let b2;
    let b3;
    let b4;
    if (b0 === 28) {
        b1 = reader.readUint8();
        b2 = reader.readUint8();
        return b1 << 8 | b2;
    }

    if (b0 === 29) {
        b1 = reader.readUint8();
        b2 = reader.readUint8();
        b3 = reader.readUint8();
        b4 = reader.readUint8();
        return b1 << 24 | b2 << 16 | b3 << 8 | b4;
    }

    if (b0 === 30) {
        return parseFloatOperand(reader);
    }

    if (b0 >= 32 && b0 <= 246) {
        return b0 - 139;
    }

    if (b0 >= 247 && b0 <= 250) {
        b1 = reader.readUint8();
        return (b0 - 247) * 256 + b1 + 108;
    }

    if (b0 >= 251 && b0 <= 254) {
        b1 = reader.readUint8();
        return -(b0 - 251) * 256 - b1 - 108;
    }

    throw new Error('invalid b0 ' + b0 + ',at:' + reader.offset);
}



/**
 * 解析字典值
 *
 * @param  {Object} dict    字典数据
 * @param  {Array} meta    元数据
 * @param  {Object} strings cff字符串字典
 * @return {Object}         解析后数据
 */
function interpretDict(dict, meta, strings) {
    const newDict = {};

    // Because we also want to include missing values, we start out from the meta list
    // and lookup values in the dict.
    for (let i = 0, l = meta.length; i < l; i++) {
        const m = meta[i];
        let value = dict[m.op];
        if (value === undefined) {
            value = m.value !== undefined ? m.value : null;
        }

        if (m.type === 'SID') {
            value = getCFFString(strings, value);
        }

        newDict[m.name] = value;
    }

    return newDict;
}


/**
 * 解析cff dict字典
 *
 * @param  {Reader} reader 读取器
 * @param  {number} offset  起始偏移
 * @param  {number} length   大小
 * @return {Object}        配置
 */
function parseCFFDict(reader, offset, length) {
    if (null != offset) {
        reader.seek(offset);
    }

    const entries = [];
    let operands = [];
    const lastOffset = reader.offset + (null != length ? length : reader.length);

    while (reader.offset < lastOffset) {
        let op = reader.readUint8();

        // The first byte for each dict item distinguishes between operator (key) and operand (value).
        // Values <= 21 are operators.
        if (op <= 21) {
            // Two-byte operators have an initial escape byte of 12.
            if (op === 12) {
                op = 1200 + reader.readUint8();
            }

            entries.push([op, operands]);
            operands = [];
        }
        else {
            // Since the operands (values) come before the operators (keys), we store all operands in a list
            // until we encounter an operator.
            operands.push(parseOperand(reader, op));
        }
    }

    return entriesToObject(entries);
}

/**
 * 解析cff top字典
 *
 * @param  {Reader} reader  读取器
 * @param  {number} start 开始offset
 * @param  {number} length 大小
 * @param  {Object} strings 字符串集合
 * @return {Object}         字典数据
 */
function parseTopDict(reader, start, length, strings) {
    const dict = parseCFFDict(reader, start || 0, length || reader.length);
    return interpretDict(dict, TOP_DICT_META, strings);
}

/**
 * 解析cff私有字典
 *
 * @param  {Reader} reader  读取器
 * @param  {number} start 开始offset
 * @param  {number} length 大小
 * @param  {Object} strings 字符串集合
 * @return {Object}         字典数据
 */
function parsePrivateDict(reader, start, length, strings) {
    const dict = parseCFFDict(reader, start || 0, length || reader.length);
    return interpretDict(dict, PRIVATE_DICT_META, strings);
}


var parseCFFDict$1 = {
    parseTopDict,
    parsePrivateDict
};

/**
 * @file 解析cff字形
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 解析cff字形，返回直线和三次bezier曲线点数组
 *
 * @param  {Array} code  操作码
 * @param  {Object} font  相关联的font对象
 * @param  {number} index glyf索引
 * @return {Object}       glyf对象
 */
function parseCFFCharstring(code, font, index) {
    let c1x;
    let c1y;
    let c2x;
    let c2y;
    const contours = [];
    let contour = [];
    const stack = [];
    const glyfs = [];
    let nStems = 0;
    let haveWidth = false;
    let width = font.defaultWidthX;
    let open = false;
    let x = 0;
    let y = 0;

    function lineTo(x, y) {
        contour.push({
            onCurve: true,
            x,
            y
        });
    }

    function curveTo(c1x, c1y, c2x, c2y, x, y) {
        contour.push({
            x: c1x,
            y: c1y
        });
        contour.push({
            x: c2x,
            y: c2y
        });
        contour.push({
            onCurve: true,
            x,
            y
        });
    }

    function newContour(x, y) {
        if (open) {
            contours.push(contour);
        }

        contour = [];
        lineTo(x, y);
        open = true;
    }

    function parseStems() {
        // The number of stem operators on the stack is always even.
        // If the value is uneven, that means a width is specified.
        const hasWidthArg = stack.length % 2 !== 0;
        if (hasWidthArg && !haveWidth) {
            width = stack.shift() + font.nominalWidthX;
        }

        nStems += stack.length >> 1;
        stack.length = 0;
        haveWidth = true;
    }

    function parse(code) {
        let b1;
        let b2;
        let b3;
        let b4;
        let codeIndex;
        let subrCode;
        let jpx;
        let jpy;
        let c3x;
        let c3y;
        let c4x;
        let c4y;

        let i = 0;
        while (i < code.length) {
            let v = code[i];
            i += 1;
            switch (v) {
            case 1: // hstem
                parseStems();
                break;
            case 3: // vstem
                parseStems();
                break;
            case 4: // vmoveto
                if (stack.length > 1 && !haveWidth) {
                    width = stack.shift() + font.nominalWidthX;
                    haveWidth = true;
                }

                y += stack.pop();
                newContour(x, y);
                break;
            case 5: // rlineto
                while (stack.length > 0) {
                    x += stack.shift();
                    y += stack.shift();
                    lineTo(x, y);
                }

                break;
            case 6: // hlineto
                while (stack.length > 0) {
                    x += stack.shift();
                    lineTo(x, y);
                    if (stack.length === 0) {
                        break;
                    }

                    y += stack.shift();
                    lineTo(x, y);
                }

                break;
            case 7: // vlineto
                while (stack.length > 0) {
                    y += stack.shift();
                    lineTo(x, y);
                    if (stack.length === 0) {
                        break;
                    }

                    x += stack.shift();
                    lineTo(x, y);
                }

                break;
            case 8: // rrcurveto
                while (stack.length > 0) {
                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + stack.shift();
                    curveTo(c1x, c1y, c2x, c2y, x, y);
                }

                break;
            case 10: // callsubr
                codeIndex = stack.pop() + font.subrsBias;
                subrCode = font.subrs[codeIndex];
                if (subrCode) {
                    parse(subrCode);
                }

                break;
            case 11: // return
                return;
            case 12: // flex operators
                v = code[i];
                i += 1;
                switch (v) {
                case 35: // flex
                    // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 dx6 dy6 fd flex (12 35) |-
                    c1x = x + stack.shift(); // dx1
                    c1y = y + stack.shift(); // dy1
                    c2x = c1x + stack.shift(); // dx2
                    c2y = c1y + stack.shift(); // dy2
                    jpx = c2x + stack.shift(); // dx3
                    jpy = c2y + stack.shift(); // dy3
                    c3x = jpx + stack.shift(); // dx4
                    c3y = jpy + stack.shift(); // dy4
                    c4x = c3x + stack.shift(); // dx5
                    c4y = c3y + stack.shift(); // dy5
                    x = c4x + stack.shift(); // dx6
                    y = c4y + stack.shift(); // dy6
                    stack.shift(); // flex depth
                    curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                    curveTo(c3x, c3y, c4x, c4y, x, y);
                    break;
                case 34: // hflex
                    // |- dx1 dx2 dy2 dx3 dx4 dx5 dx6 hflex (12 34) |-
                    c1x = x + stack.shift(); // dx1
                    c1y = y; // dy1
                    c2x = c1x + stack.shift(); // dx2
                    c2y = c1y + stack.shift(); // dy2
                    jpx = c2x + stack.shift(); // dx3
                    jpy = c2y; // dy3
                    c3x = jpx + stack.shift(); // dx4
                    c3y = c2y; // dy4
                    c4x = c3x + stack.shift(); // dx5
                    c4y = y; // dy5
                    x = c4x + stack.shift(); // dx6
                    curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                    curveTo(c3x, c3y, c4x, c4y, x, y);
                    break;
                case 36: // hflex1
                    // |- dx1 dy1 dx2 dy2 dx3 dx4 dx5 dy5 dx6 hflex1 (12 36) |-
                    c1x = x + stack.shift(); // dx1
                    c1y = y + stack.shift(); // dy1
                    c2x = c1x + stack.shift(); // dx2
                    c2y = c1y + stack.shift(); // dy2
                    jpx = c2x + stack.shift(); // dx3
                    jpy = c2y; // dy3
                    c3x = jpx + stack.shift(); // dx4
                    c3y = c2y; // dy4
                    c4x = c3x + stack.shift(); // dx5
                    c4y = c3y + stack.shift(); // dy5
                    x = c4x + stack.shift(); // dx6
                    curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                    curveTo(c3x, c3y, c4x, c4y, x, y);
                    break;
                case 37: // flex1
                    // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 d6 flex1 (12 37) |-
                    c1x = x + stack.shift(); // dx1
                    c1y = y + stack.shift(); // dy1
                    c2x = c1x + stack.shift(); // dx2
                    c2y = c1y + stack.shift(); // dy2
                    jpx = c2x + stack.shift(); // dx3
                    jpy = c2y + stack.shift(); // dy3
                    c3x = jpx + stack.shift(); // dx4
                    c3y = jpy + stack.shift(); // dy4
                    c4x = c3x + stack.shift(); // dx5
                    c4y = c3y + stack.shift(); // dy5
                    if (Math.abs(c4x - x) > Math.abs(c4y - y)) {
                        x = c4x + stack.shift();
                    }
                    else {
                        y = c4y + stack.shift();
                    }

                    curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                    curveTo(c3x, c3y, c4x, c4y, x, y);
                    break;
                default:
                    console.warn('Glyph ' + index + ': unknown operator ' + (1200 + v));
                    stack.length = 0;
                }
                break;
            case 14: // endchar
                if (stack.length === 1 && !haveWidth) {
                    width = stack.shift() + font.nominalWidthX;
                    haveWidth = true;
                }
                else if (stack.length === 4) {
                    glyfs[1] = {
                        glyphIndex: font.charset.indexOf(font.encoding[stack.pop()]),
                        transform: {a: 1, b: 0, c: 0, d: 1, e: 0, f: 0}
                    };
                    glyfs[0] = {
                        glyphIndex: font.charset.indexOf(font.encoding[stack.pop()]),
                        transform: {a: 1, b: 0, c: 0, d: 1, e: 0, f: 0}
                    };
                    glyfs[1].transform.f = stack.pop();
                    glyfs[1].transform.e = stack.pop();
                }
                else if (stack.length === 5) {
                    if (!haveWidth) {
                        width = stack.shift() + font.nominalWidthX;
                    }
                    haveWidth = true;
                    glyfs[1] = {
                        glyphIndex: font.charset.indexOf(font.encoding[stack.pop()]),
                        transform: {a: 1, b: 0, c: 0, d: 1, e: 0, f: 0}
                    };
                    glyfs[0] = {
                        glyphIndex: font.charset.indexOf(font.encoding[stack.pop()]),
                        transform: {a: 1, b: 0, c: 0, d: 1, e: 0, f: 0}
                    };
                    glyfs[1].transform.f = stack.pop();
                    glyfs[1].transform.e = stack.pop();
                }

                if (open) {
                    contours.push(contour);
                    open = false;
                }

                break;
            case 18: // hstemhm
                parseStems();
                break;
            case 19: // hintmask
            case 20: // cntrmask
                parseStems();
                i += (nStems + 7) >> 3;
                break;
            case 21: // rmoveto
                if (stack.length > 2 && !haveWidth) {
                    width = stack.shift() + font.nominalWidthX;
                    haveWidth = true;
                }

                y += stack.pop();
                x += stack.pop();
                newContour(x, y);
                break;
            case 22: // hmoveto
                if (stack.length > 1 && !haveWidth) {
                    width = stack.shift() + font.nominalWidthX;
                    haveWidth = true;
                }

                x += stack.pop();
                newContour(x, y);
                break;
            case 23: // vstemhm
                parseStems();
                break;
            case 24: // rcurveline
                while (stack.length > 2) {
                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + stack.shift();
                    curveTo(c1x, c1y, c2x, c2y, x, y);
                }

                x += stack.shift();
                y += stack.shift();
                lineTo(x, y);
                break;
            case 25: // rlinecurve
                while (stack.length > 6) {
                    x += stack.shift();
                    y += stack.shift();
                    lineTo(x, y);
                }

                c1x = x + stack.shift();
                c1y = y + stack.shift();
                c2x = c1x + stack.shift();
                c2y = c1y + stack.shift();
                x = c2x + stack.shift();
                y = c2y + stack.shift();
                curveTo(c1x, c1y, c2x, c2y, x, y);
                break;
            case 26: // vvcurveto
                if (stack.length % 2) {
                    x += stack.shift();
                }

                while (stack.length > 0) {
                    c1x = x;
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x;
                    y = c2y + stack.shift();
                    curveTo(c1x, c1y, c2x, c2y, x, y);
                }

                break;
            case 27: // hhcurveto
                if (stack.length % 2) {
                    y += stack.shift();
                }

                while (stack.length > 0) {
                    c1x = x + stack.shift();
                    c1y = y;
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y;
                    curveTo(c1x, c1y, c2x, c2y, x, y);
                }

                break;
            case 28: // shortint
                b1 = code[i];
                b2 = code[i + 1];
                stack.push(((b1 << 24) | (b2 << 16)) >> 16);
                i += 2;
                break;
            case 29: // callgsubr
                codeIndex = stack.pop() + font.gsubrsBias;
                subrCode = font.gsubrs[codeIndex];
                if (subrCode) {
                    parse(subrCode);
                }

                break;
            case 30: // vhcurveto
                while (stack.length > 0) {
                    c1x = x;
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + (stack.length === 1 ? stack.shift() : 0);
                    curveTo(c1x, c1y, c2x, c2y, x, y);
                    if (stack.length === 0) {
                        break;
                    }

                    c1x = x + stack.shift();
                    c1y = y;
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    y = c2y + stack.shift();
                    x = c2x + (stack.length === 1 ? stack.shift() : 0);
                    curveTo(c1x, c1y, c2x, c2y, x, y);
                }

                break;
            case 31: // hvcurveto
                while (stack.length > 0) {
                    c1x = x + stack.shift();
                    c1y = y;
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    y = c2y + stack.shift();
                    x = c2x + (stack.length === 1 ? stack.shift() : 0);
                    curveTo(c1x, c1y, c2x, c2y, x, y);
                    if (stack.length === 0) {
                        break;
                    }

                    c1x = x;
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + (stack.length === 1 ? stack.shift() : 0);
                    curveTo(c1x, c1y, c2x, c2y, x, y);
                }

                break;
            default:
                if (v < 32) {
                    console.warn('Glyph ' + index + ': unknown operator ' + v);
                }
                else if (v < 247) {
                    stack.push(v - 139);
                }
                else if (v < 251) {
                    b1 = code[i];
                    i += 1;
                    stack.push((v - 247) * 256 + b1 + 108);
                }
                else if (v < 255) {
                    b1 = code[i];
                    i += 1;
                    stack.push(-(v - 251) * 256 - b1 - 108);
                }
                else {
                    b1 = code[i];
                    b2 = code[i + 1];
                    b3 = code[i + 2];
                    b4 = code[i + 3];
                    i += 4;
                    stack.push(((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) / 65536);
                }
            }
        }
    }

    parse(code);

    const glyf = {

        // 移除重复的起点和终点
        contours: contours.map(contour => {
            const last = contour.length - 1;
            if (contour[0].x === contour[last].x && contour[0].y === contour[last].y) {
                contour.splice(last, 1);
            }
            return contour;
        }),

        advanceWidth: width
    };
    if (glyfs.length) {
        glyf.compound = true;
        glyf.glyfs = glyfs;
    }
    return glyf;
}

/**
 * @file 解析cff字符集
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 解析cff字形名称
 * See Adobe TN #5176 chapter 13, "Charsets".
 *
 * @param  {Reader} reader  读取器
 * @param  {number} start   起始偏移
 * @param  {number} nGlyphs 字形个数
 * @param  {Object} strings cff字符串字典
 * @return {Array}         字符集
 */
function parseCFFCharset(reader, start, nGlyphs, strings) {
    if (start) {
        reader.seek(start);
    }

    let i;
    let sid;
    let count;
    // The .notdef glyph is not included, so subtract 1.
    nGlyphs -= 1;
    const charset = ['.notdef'];

    const format = reader.readUint8();
    if (format === 0) {
        for (i = 0; i < nGlyphs; i += 1) {
            sid = reader.readUint16();
            charset.push(getCFFString(strings, sid));
        }
    }
    else if (format === 1) {
        while (charset.length <= nGlyphs) {
            sid = reader.readUint16();
            count = reader.readUint8();
            for (i = 0; i <= count; i += 1) {
                charset.push(getCFFString(strings, sid));
                sid += 1;
            }
        }
    }
    else if (format === 2) {
        while (charset.length <= nGlyphs) {
            sid = reader.readUint16();
            count = reader.readUint16();
            for (i = 0; i <= count; i += 1) {
                charset.push(getCFFString(strings, sid));
                sid += 1;
            }
        }
    }
    else {
        throw new Error('Unknown charset format ' + format);
    }

    return charset;
}

/**
 * @file 解析cff编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 解析cff encoding数据
 * See Adobe TN #5176 chapter 12, "Encodings".
 *
 * @param  {Reader} reader 读取器
 * @param  {number=} start  偏移
 * @return {Object}        编码表
 */
function parseCFFEncoding(reader, start) {
    if (null != start) {
        reader.seek(start);
    }

    let i;
    let code;
    const encoding = {};
    const format = reader.readUint8();

    if (format === 0) {
        const nCodes = reader.readUint8();
        for (i = 0; i < nCodes; i += 1) {
            code = reader.readUint8();
            encoding[code] = i;
        }
    }
    else if (format === 1) {
        const nRanges = reader.readUint8();
        code = 1;
        for (i = 0; i < nRanges; i += 1) {
            const first = reader.readUint8();
            const nLeft = reader.readUint8();
            for (let j = first; j <= first + nLeft; j += 1) {
                encoding[j] = code;
                code += 1;
            }
        }
    }
    else {
        console.warn('unknown encoding format:' + format);
    }

    return encoding;
}

/**
 * @file cff表
 * @author mengke01(kekee000@gmail.com)
 *
 * reference:
 * http://wwwimages.adobe.com/content/dam/Adobe/en/devnet/font/pdfs/5176.CFF.pdf
 *
 * modify from:
 * https://github.com/nodebox/opentype.js/blob/master/src/tables/cff.js
 */

/**
 * 获取cff偏移
 *
 * @param  {Reader} reader  读取器
 * @param  {number} offSize 偏移大小
 * @param  {number} offset  起始偏移
 * @return {number}         偏移
 */
function getOffset(reader, offSize) {
    let v = 0;
    for (let i = 0; i < offSize; i++) {
        v <<= 8;
        v += reader.readUint8();
    }
    return v;
}

/**
 * 解析cff表头部
 *
 * @param  {Reader} reader 读取器
 * @return {Object}        头部字段
 */
function parseCFFHead(reader) {
    const head = {};
    head.startOffset = reader.offset;
    head.endOffset = head.startOffset + 4;
    head.formatMajor = reader.readUint8();
    head.formatMinor = reader.readUint8();
    head.size = reader.readUint8();
    head.offsetSize = reader.readUint8();
    return head;
}

/**
 * 解析`CFF`表索引
 *
 * @param  {Reader} reader       读取器
 * @param  {number} offset       偏移
 * @param  {Funciton} conversionFn 转换函数
 * @return {Object}              表对象
 */
function parseCFFIndex(reader, offset, conversionFn) {
    if (offset) {
        reader.seek(offset);
    }
    const start = reader.offset;
    const offsets = [];
    const objects = [];
    const count = reader.readUint16();
    let i;
    let l;
    if (count !== 0) {
        const offsetSize = reader.readUint8();
        for (i = 0, l = count + 1; i < l; i++) {
            offsets.push(getOffset(reader, offsetSize));
        }

        for (i = 0, l = count; i < l; i++) {
            let value = reader.readBytes(offsets[i + 1] - offsets[i]);
            if (conversionFn) {
                value = conversionFn(value);
            }
            objects.push(value);
        }
    }

    return {
        objects,
        startOffset: start,
        endOffset: reader.offset
    };
}

// Subroutines are encoded using the negative half of the number space.
// See type 2 chapter 4.7 "Subroutine operators".
function calcCFFSubroutineBias(subrs) {
    let bias;
    if (subrs.length < 1240) {
        bias = 107;
    }
    else if (subrs.length < 33900) {
        bias = 1131;
    }
    else {
        bias = 32768;
    }

    return bias;
}


var CFF = table.create(
    'cff',
    [],
    {
        read(reader, font) {

            const offset = this.offset;
            reader.seek(offset);

            const head = parseCFFHead(reader);
            const nameIndex = parseCFFIndex(reader, head.endOffset, utilString.getString);
            const topDictIndex = parseCFFIndex(reader, nameIndex.endOffset);
            const stringIndex = parseCFFIndex(reader, topDictIndex.endOffset, utilString.getString);
            const globalSubrIndex = parseCFFIndex(reader, stringIndex.endOffset);

            const cff = {
                head
            };

            // 全局子glyf数据
            cff.gsubrs = globalSubrIndex.objects;
            cff.gsubrsBias = calcCFFSubroutineBias(globalSubrIndex.objects);

            // 顶级字典数据
            const dictReader = new Reader(new Uint8Array(topDictIndex.objects[0]).buffer);
            const topDict = parseCFFDict$1.parseTopDict(
                dictReader,
                0,
                dictReader.length,
                stringIndex.objects
            );
            cff.topDict = topDict;

            // 私有字典数据
            const privateDictLength = topDict.private[0];
            let privateDict = {};
            let privateDictOffset;
            if (privateDictLength) {
                privateDictOffset = offset + topDict.private[1];
                privateDict = parseCFFDict$1.parsePrivateDict(
                    reader,
                    privateDictOffset,
                    privateDictLength,
                    stringIndex.objects
                );
                cff.defaultWidthX = privateDict.defaultWidthX;
                cff.nominalWidthX = privateDict.nominalWidthX;
            }
            else {
                cff.defaultWidthX = 0;
                cff.nominalWidthX = 0;
            }

            // 私有子glyf数据
            if (privateDict.subrs) {
                const subrOffset = privateDictOffset + privateDict.subrs;
                const subrIndex = parseCFFIndex(reader, subrOffset);
                cff.subrs = subrIndex.objects;
                cff.subrsBias = calcCFFSubroutineBias(cff.subrs);
            }
            else {
                cff.subrs = [];
                cff.subrsBias = 0;
            }
            cff.privateDict = privateDict;

            // 解析glyf数据和名字
            const charStringsIndex = parseCFFIndex(reader, offset + topDict.charStrings);
            const nGlyphs = charStringsIndex.objects.length;

            if (topDict.charset < 3) {
                // @author: fr33z00
                // See end of chapter 13 (p22) of #5176.CFF.pdf :
                // Still more optimization is possible by
                // observing that many fonts adopt one of 3 common charsets. In
                // these cases the operand to the charset operator in the Top DICT
                // specifies a predefined charset id, in place of an offset, as shown in table 22
                cff.charset = cffStandardStrings;
            }
            else {
                cff.charset = parseCFFCharset(reader, offset + topDict.charset, nGlyphs, stringIndex.objects);
            }

            // Standard encoding
            if (topDict.encoding === 0) {
                cff.encoding = encoding.standardEncoding;
            }
            // Expert encoding
            else if (topDict.encoding === 1) {
                cff.encoding = encoding.expertEncoding;
            }
            else {
                cff.encoding = parseCFFEncoding(reader, offset + topDict.encoding);
            }

            cff.glyf = [];

            // only parse subset glyphs
            const subset = font.readOptions.subset;
            if (subset && subset.length > 0) {

                // subset map
                const subsetMap = {
                    0: true // 设置.notdef
                };
                const codes = font.cmap;

                // unicode to index
                Object.keys(codes).forEach((c) => {
                    if (subset.indexOf(+c) > -1) {
                        const i = codes[c];
                        subsetMap[i] = true;
                    }
                });
                font.subsetMap = subsetMap;

                Object.keys(subsetMap).forEach((i) => {
                    i = +i;
                    const glyf = parseCFFCharstring(charStringsIndex.objects[i], cff, i);
                    glyf.name = cff.charset[i];
                    cff.glyf[i] = glyf;
                });
            }
            // parse all
            else {
                for (let i = 0, l = nGlyphs; i < l; i++) {
                    const glyf = parseCFFCharstring(charStringsIndex.objects[i], cff, i);
                    glyf.name = cff.charset[i];
                    cff.glyf.push(glyf);
                }
            }

            return cff;
        },

        // eslint-disable-next-line no-unused-vars
        write(writer, font) {
            throw new Error('not support write cff table');
        },

        // eslint-disable-next-line no-unused-vars
        size(font) {
            throw new Error('not support get cff table size');
        }
    }
);

/**
 * @file GPOS
 * @author fr33z00(https://github.com/fr33z00)
 *
 * @reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cvt.html
 */

var GPOS = table.create(
    'GPOS',
    [],
    {

        read(reader, ttf) {
            const length = ttf.tables.GPOS.length;
            return reader.readBytes(this.offset, length);
        },

        write(writer, ttf) {
            if (ttf.GPOS) {
                writer.writeBytes(ttf.GPOS, ttf.GPOS.length);
            }
        },

        size(ttf) {
            return ttf.GPOS ? ttf.GPOS.length : 0;
        }
    }
);

/**
 * @file kern
 * @author fr33z00(https://github.com/fr33z00)
 *
 * @reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cvt.html
 */

var kern = table.create(
    'kern',
    [],
    {

        read(reader, ttf) {
            const length = ttf.tables.kern.length;
            return reader.readBytes(this.offset, length);
        },

        write(writer, ttf) {
            if (ttf.kern) {
                writer.writeBytes(ttf.kern, ttf.kern.length);
            }
        },

        size(ttf) {
            return ttf.kern ? ttf.kern.length : 0;
        }
    }
);

/**
 * @file otf字体格式支持的表
 * @author mengke01(kekee000@gmail.com)
 */

var supportTables$1 = {
    head,
    maxp,
    cmap,
    name: NameTbl,
    hhea,
    hmtx,
    post,
    'OS/2': OS2,
    CFF,
    GPOS,
    kern
};

/**
 * @file otf字体读取
 * @author mengke01(kekee000@gmail.com)
 */

class OTFReader {

    /**
     * OTF读取函数
     *
     * @param {Object} options 写入参数
     * @constructor
     */
    constructor(options = {}) {
        options.subset = options.subset || [];
        this.options = options;
    }

    /**
     * 初始化
     *
     * @param {ArrayBuffer} buffer buffer对象
     * @return {Object} ttf对象
     */
    readBuffer(buffer) {

        const reader = new Reader(buffer, 0, buffer.byteLength, false);
        const font = {};

        // version
        font.version = reader.readString(0, 4);

        if (font.version !== 'OTTO') {
            error.raise(10301);
        }

        // num tables
        font.numTables = reader.readUint16();

        if (font.numTables <= 0 || font.numTables > 100) {
            error.raise(10302);
        }

        // searchRange
        font.searchRange = reader.readUint16();

        // entrySelector
        font.entrySelector = reader.readUint16();

        // rangeShift
        font.rangeShift = reader.readUint16();

        font.tables = new Directory(reader.offset).read(reader, font);

        if (!font.tables.head || !font.tables.cmap || !font.tables.CFF) {
            error.raise(10302);
        }

        font.readOptions = this.options;

        // 读取支持的表数据
        Object.keys(supportTables$1).forEach((tableName) => {
            if (font.tables[tableName]) {
                const offset = font.tables[tableName].offset;
                font[tableName] = new supportTables$1[tableName](offset).read(reader, font);
            }
        });

        if (!font.CFF.glyf) {
            error.raise(10303);
        }

        reader.dispose();

        return font;
    }

    /**
     * 关联glyf相关的信息
     *
     * @param {Object} font font对象
     */
    resolveGlyf(font) {

        const codes = font.cmap;
        let glyf = font.CFF.glyf;
        const subsetMap = font.readOptions.subset ? font.subsetMap : null; // 当前ttf的子集列表
        // unicode
        Object.keys(codes).forEach((c) => {
            const i = codes[c];
            if (subsetMap && !subsetMap[i]) {
                return;
            }
            if (!glyf[i].unicode) {
                glyf[i].unicode = [];
            }
            glyf[i].unicode.push(+c);
        });

        // leftSideBearing
        font.hmtx.forEach((item, i) => {
            if (subsetMap && !subsetMap[i]) {
                return;
            }
            glyf[i].advanceWidth = glyf[i].advanceWidth || item.advanceWidth || 0;
            glyf[i].leftSideBearing = item.leftSideBearing;
        });

        // 设置了subsetMap之后需要选取subset中的字形
        if (subsetMap) {
            const subGlyf = [];
            Object.keys(subsetMap).forEach((i) => {
                subGlyf.push(glyf[+i]);
            });
            glyf = subGlyf;
        }

        font.glyf = glyf;
    }

    /**
     * 清除非必须的表
     *
     * @param {Object} font font对象
     */
    cleanTables(font) {
        delete font.readOptions;
        delete font.tables;
        delete font.hmtx;
        delete font.post.glyphNameIndex;
        delete font.post.names;
        delete font.subsetMap;

        // 删除无用的表
        const cff = font.CFF;
        delete cff.glyf;
        delete cff.charset;
        delete cff.encoding;
        delete cff.gsubrs;
        delete cff.gsubrsBias;
        delete cff.subrs;
        delete cff.subrsBias;
    }

    /**
     * 获取解析后的ttf文档
     *
     * @param {ArrayBuffer} buffer buffer对象
     *
     * @return {Object} ttf文档
     */
    read(buffer) {
        this.font = this.readBuffer(buffer);
        this.resolveGlyf(this.font);
        this.cleanTables(this.font);
        return this.font;
    }

    /**
     * 注销
     */
    dispose() {
        delete this.font;
        delete this.options;
    }
}

/**
 * @file 三次贝塞尔转二次贝塞尔
 * @author mengke01(kekee000@gmail.com)
 *
 * references:
 * https://github.com/search?utf8=%E2%9C%93&q=svg2ttf
 * http://www.caffeineowl.com/graphics/2d/vectorial/cubic2quad01.html
 *
 */

function toQuad(p1, c1, c2, p2) {
    // Quad control point is (3*c2 - p2 + 3*c1 - p1)/4
    const x = (3 * c2.x - p2.x + 3 * c1.x - p1.x) / 4;
    const y = (3 * c2.y - p2.y + 3 * c1.y - p1.y) / 4;
    return [
        p1,
        {x, y},
        p2
    ];
}


/**
 * 三次贝塞尔转二次贝塞尔
 *
 * @param {Object} p1 开始点
 * @param {Object} c1 控制点1
 * @param {Object} c2 控制点2
 * @param {Object} p2 结束点
 * @return {Array} 二次贝塞尔控制点
 */
function bezierCubic2Q2(p1, c1, c2, p2) {

    // 判断极端情况，控制点和起止点一样
    if (p1.x === c1.x && p1.y === c1.y && c2.x === p2.x && c2.y === p2.y) {
        return [
            [
                p1,
                {
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2
                },
                p2
            ]
        ];
    }

    const mx = p2.x - 3 * c2.x + 3 * c1.x - p1.x;
    const my = p2.y - 3 * c2.y + 3 * c1.y - p1.y;

    // control points near
    if (mx * mx + my * my <= 4) {
        return [
            toQuad(p1, c1, c2, p2)
        ];
    }

    // Split to 2 qubic beziers by midpoints
    // (p2 + 3*c2 + 3*c1 + p1)/8
    const mp = {
        x: (p2.x + 3 * c2.x + 3 * c1.x + p1.x) / 8,
        y: (p2.y + 3 * c2.y + 3 * c1.y + p1.y) / 8
    };

    return [
        toQuad(
            p1,
            {
                x: (p1.x + c1.x) / 2,
                y: (p1.y + c1.y) / 2

            },
            {
                x: (p1.x + 2 * c1.x + c2.x) / 4,
                y: (p1.y + 2 * c1.y + c2.y) / 4
            },
            mp
        ),
        toQuad(
            mp,
            {
                x: (p2.x + c1.x + 2 * c2.x) / 4,
                y: (p2.y + c1.y + 2 * c2.y) / 4

            },
            {
                x: (p2.x + c2.x) / 2,
                y: (p2.y + c2.y) / 2
            },
            p2
        )
    ];
}

/**
 * @file otf轮廓转ttf轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 转换轮廓
 *
 * @param  {Array} otfContour otf轮廓
 * @return {Array}            ttf轮廓
 */
function transformContour(otfContour) {
    const contour = [];
    let prevPoint;
    let curPoint;
    let nextPoint;
    let nextNextPoint;

    contour.push(prevPoint = otfContour[0]);
    for (let i = 1, l = otfContour.length; i < l; i++) {
        curPoint = otfContour[i];

        if (curPoint.onCurve) {
            contour.push(curPoint);
            prevPoint = curPoint;
        }
        // 三次bezier曲线
        else {
            nextPoint = otfContour[i + 1];
            nextNextPoint = i === l - 2 ? otfContour[0] : otfContour[i + 2];
            const bezierArray = bezierCubic2Q2(prevPoint, curPoint, nextPoint, nextNextPoint);
            bezierArray[0][2].onCurve = true;
            contour.push(bezierArray[0][1]);
            contour.push(bezierArray[0][2]);

            // 第二个曲线
            if (bezierArray[1]) {
                bezierArray[1][2].onCurve = true;
                contour.push(bezierArray[1][1]);
                contour.push(bezierArray[1][2]);
            }

            prevPoint = nextNextPoint;
            i += 2;
        }
    }

    return pathCeil(contour);
}


/**
 * otf轮廓转ttf轮廓
 *
 * @param  {Array} otfContours otf轮廓数组
 * @return {Array} ttf轮廓
 */
function otfContours2ttfContours(otfContours) {
    if (!otfContours || !otfContours.length) {
        return otfContours;
    }
    const contours = [];
    for (let i = 0, l = otfContours.length; i < l; i++) {

        // 这里可能由于转换错误导致空轮廓，需要去除
        if (otfContours[i][0]) {
            contours.push(transformContour(otfContours[i]));
        }
    }

    return contours;
}

/**
 * @file otf格式转ttf格式对象
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * otf格式转ttf格式对象
 *
 * @param  {ArrayBuffer|otfObject} otfBuffer 原始数据或者解析后的otf数据
 * @param  {Object} options   参数
 * @return {Object}          ttfObject对象
 */
function otf2ttfobject(otfBuffer, options) {
    let otfObject;
    if (otfBuffer instanceof ArrayBuffer) {
        const otfReader = new OTFReader(options);
        otfObject = otfReader.read(otfBuffer);
        otfReader.dispose();
    }
    else if (otfBuffer.head && otfBuffer.glyf && otfBuffer.cmap) {
        otfObject = otfBuffer;
    }
    else {
        error.raise(10111);
    }

    // 转换otf轮廓
    otfObject.glyf.forEach((g) => {
        g.contours = otfContours2ttfContours(g.contours);
        const box = computePathBox(...g.contours);
        if (box) {
            g.xMin = box.x;
            g.xMax = box.x + box.width;
            g.yMin = box.y;
            g.yMax = box.y + box.height;
            g.leftSideBearing = g.xMin;
        }
        else {
            g.xMin = 0;
            g.xMax = 0;
            g.yMin = 0;
            g.yMax = 0;
            g.leftSideBearing = 0;
        }
    });

    otfObject.version = 0x1;

    // 修改maxp相关配置
    otfObject.maxp.version = 1.0;
    otfObject.maxp.maxZones = otfObject.maxp.maxTwilightPoints ? 2 : 1;

    delete otfObject.CFF;
    delete otfObject.VORG;

    return otfObject;
}

/**
 * @file eot转ttf
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * eot格式转换成ttf字体格式
 *
 * @param {ArrayBuffer} eotBuffer eot缓冲数组
 * @param {Object} options 选项
 *
 * @return {ArrayBuffer} ttf格式byte流
 */
// eslint-disable-next-line no-unused-vars
function eot2ttf(eotBuffer, options = {}) {
    // 这里用小尾方式读取
    const eotReader = new Reader(eotBuffer, 0, eotBuffer.byteLength, true);

    // check magic number
    const magicNumber = eotReader.readUint16(34);
    if (magicNumber !== 0x504C) {
        error.raise(10110);
    }

    // check version
    const version = eotReader.readUint32(8);
    if (version !== 0x20001 && version !== 0x10000 && version !== 0x20002) {
        error.raise(10110);
    }

    const eotSize = eotBuffer.byteLength || eotBuffer.length;
    const fontSize = eotReader.readUint32(4);

    let fontOffset = 82;
    const familyNameSize = eotReader.readUint16(fontOffset);
    fontOffset += 4 + familyNameSize;

    const styleNameSize = eotReader.readUint16(fontOffset);
    fontOffset += 4 + styleNameSize;

    const versionNameSize = eotReader.readUint16(fontOffset);
    fontOffset += 4 + versionNameSize;

    const fullNameSize = eotReader.readUint16(fontOffset);
    fontOffset += 2 + fullNameSize;

    // version 0x20001
    if (version === 0x20001 || version === 0x20002) {
        const rootStringSize = eotReader.readUint16(fontOffset + 2);
        fontOffset += 4 + rootStringSize;
    }

    // version 0x20002
    if (version === 0x20002) {
        fontOffset += 10;
        const signatureSize = eotReader.readUint16(fontOffset);
        fontOffset += 2 + signatureSize;
        fontOffset += 4;
        const eudcFontSize = eotReader.readUint32(fontOffset);
        fontOffset += 4 + eudcFontSize;
    }

    if (fontOffset + fontSize > eotSize) {
        error.raise(10001);
    }

    // support slice
    if (eotBuffer.slice) {
        return eotBuffer.slice(fontOffset, fontOffset + fontSize);
    }

    // not support ArrayBuffer.slice eg. IE10
    const bytes = eotReader.readBytes(fontOffset, fontSize);
    return new Writer(new ArrayBuffer(fontSize)).writeBytes(bytes).getBuffer();
}

var domParser = {};

var entities = {};

entities.entityMap = {
       lt: '<',
       gt: '>',
       amp: '&',
       quot: '"',
       apos: "'",
       Agrave: "À",
       Aacute: "Á",
       Acirc: "Â",
       Atilde: "Ã",
       Auml: "Ä",
       Aring: "Å",
       AElig: "Æ",
       Ccedil: "Ç",
       Egrave: "È",
       Eacute: "É",
       Ecirc: "Ê",
       Euml: "Ë",
       Igrave: "Ì",
       Iacute: "Í",
       Icirc: "Î",
       Iuml: "Ï",
       ETH: "Ð",
       Ntilde: "Ñ",
       Ograve: "Ò",
       Oacute: "Ó",
       Ocirc: "Ô",
       Otilde: "Õ",
       Ouml: "Ö",
       Oslash: "Ø",
       Ugrave: "Ù",
       Uacute: "Ú",
       Ucirc: "Û",
       Uuml: "Ü",
       Yacute: "Ý",
       THORN: "Þ",
       szlig: "ß",
       agrave: "à",
       aacute: "á",
       acirc: "â",
       atilde: "ã",
       auml: "ä",
       aring: "å",
       aelig: "æ",
       ccedil: "ç",
       egrave: "è",
       eacute: "é",
       ecirc: "ê",
       euml: "ë",
       igrave: "ì",
       iacute: "í",
       icirc: "î",
       iuml: "ï",
       eth: "ð",
       ntilde: "ñ",
       ograve: "ò",
       oacute: "ó",
       ocirc: "ô",
       otilde: "õ",
       ouml: "ö",
       oslash: "ø",
       ugrave: "ù",
       uacute: "ú",
       ucirc: "û",
       uuml: "ü",
       yacute: "ý",
       thorn: "þ",
       yuml: "ÿ",
       nbsp: "\u00a0",
       iexcl: "¡",
       cent: "¢",
       pound: "£",
       curren: "¤",
       yen: "¥",
       brvbar: "¦",
       sect: "§",
       uml: "¨",
       copy: "©",
       ordf: "ª",
       laquo: "«",
       not: "¬",
       shy: "­­",
       reg: "®",
       macr: "¯",
       deg: "°",
       plusmn: "±",
       sup2: "²",
       sup3: "³",
       acute: "´",
       micro: "µ",
       para: "¶",
       middot: "·",
       cedil: "¸",
       sup1: "¹",
       ordm: "º",
       raquo: "»",
       frac14: "¼",
       frac12: "½",
       frac34: "¾",
       iquest: "¿",
       times: "×",
       divide: "÷",
       forall: "∀",
       part: "∂",
       exist: "∃",
       empty: "∅",
       nabla: "∇",
       isin: "∈",
       notin: "∉",
       ni: "∋",
       prod: "∏",
       sum: "∑",
       minus: "−",
       lowast: "∗",
       radic: "√",
       prop: "∝",
       infin: "∞",
       ang: "∠",
       and: "∧",
       or: "∨",
       cap: "∩",
       cup: "∪",
       'int': "∫",
       there4: "∴",
       sim: "∼",
       cong: "≅",
       asymp: "≈",
       ne: "≠",
       equiv: "≡",
       le: "≤",
       ge: "≥",
       sub: "⊂",
       sup: "⊃",
       nsub: "⊄",
       sube: "⊆",
       supe: "⊇",
       oplus: "⊕",
       otimes: "⊗",
       perp: "⊥",
       sdot: "⋅",
       Alpha: "Α",
       Beta: "Β",
       Gamma: "Γ",
       Delta: "Δ",
       Epsilon: "Ε",
       Zeta: "Ζ",
       Eta: "Η",
       Theta: "Θ",
       Iota: "Ι",
       Kappa: "Κ",
       Lambda: "Λ",
       Mu: "Μ",
       Nu: "Ν",
       Xi: "Ξ",
       Omicron: "Ο",
       Pi: "Π",
       Rho: "Ρ",
       Sigma: "Σ",
       Tau: "Τ",
       Upsilon: "Υ",
       Phi: "Φ",
       Chi: "Χ",
       Psi: "Ψ",
       Omega: "Ω",
       alpha: "α",
       beta: "β",
       gamma: "γ",
       delta: "δ",
       epsilon: "ε",
       zeta: "ζ",
       eta: "η",
       theta: "θ",
       iota: "ι",
       kappa: "κ",
       lambda: "λ",
       mu: "μ",
       nu: "ν",
       xi: "ξ",
       omicron: "ο",
       pi: "π",
       rho: "ρ",
       sigmaf: "ς",
       sigma: "σ",
       tau: "τ",
       upsilon: "υ",
       phi: "φ",
       chi: "χ",
       psi: "ψ",
       omega: "ω",
       thetasym: "ϑ",
       upsih: "ϒ",
       piv: "ϖ",
       OElig: "Œ",
       oelig: "œ",
       Scaron: "Š",
       scaron: "š",
       Yuml: "Ÿ",
       fnof: "ƒ",
       circ: "ˆ",
       tilde: "˜",
       ensp: " ",
       emsp: " ",
       thinsp: " ",
       zwnj: "‌",
       zwj: "‍",
       lrm: "‎",
       rlm: "‏",
       ndash: "–",
       mdash: "—",
       lsquo: "‘",
       rsquo: "’",
       sbquo: "‚",
       ldquo: "“",
       rdquo: "”",
       bdquo: "„",
       dagger: "†",
       Dagger: "‡",
       bull: "•",
       hellip: "…",
       permil: "‰",
       prime: "′",
       Prime: "″",
       lsaquo: "‹",
       rsaquo: "›",
       oline: "‾",
       euro: "€",
       trade: "™",
       larr: "←",
       uarr: "↑",
       rarr: "→",
       darr: "↓",
       harr: "↔",
       crarr: "↵",
       lceil: "⌈",
       rceil: "⌉",
       lfloor: "⌊",
       rfloor: "⌋",
       loz: "◊",
       spades: "♠",
       clubs: "♣",
       hearts: "♥",
       diams: "♦"
};

var sax$1 = {};

//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;//\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring 
var S_ATTR_SPACE=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_ATTR_NOQUOT_VALUE = 4;//attr value(no quot value only)
var S_ATTR_END = 5;//attr value end and no space(quot end)
var S_TAG_SPACE = 6;//(attr value end || tag end ) && (space offer)
var S_TAG_CLOSE = 7;//closed el<el />

/**
 * Creates an error that will not be caught by XMLReader aka the SAX parser.
 *
 * @param {string} message
 * @param {any?} locator Optional, can provide details about the location in the source
 * @constructor
 */
function ParseError$1(message, locator) {
	this.message = message;
	this.locator = locator;
	if(Error.captureStackTrace) Error.captureStackTrace(this, ParseError$1);
}
ParseError$1.prototype = new Error();
ParseError$1.prototype.name = ParseError$1.name;

function XMLReader$1(){
	
}

XMLReader$1.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {});
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
};
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
	function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if(k in entityMap){
			return entityMap[k]; 
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else {
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		if(end>start){
			var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
			locator&&position(start);
			domBuilder.characters(xt,0,end-start);
			start = end;
		}
	}
	function position(p,m){
		while(p>=lineEnd && (m = linePattern.exec(source))){
			lineStart = m.index;
			lineEnd = lineStart + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = p-lineStart+1;
	}
	var lineStart = 0;
	var lineEnd = 0;
	var linePattern = /.*(?:\r\n?|\n)|.*$/g;
	var locator = domBuilder.locator;
	
	var parseStack = [{currentNSMap:defaultNSMapCopy}];
	var closeMap = {};
	var start = 0;
	while(true){
		try{
			var tagStart = source.indexOf('<',start);
			if(tagStart<0){
				if(!source.substr(start).match(/^\s*$/)){
					var doc = domBuilder.doc;
	    			var text = doc.createTextNode(source.substr(start));
	    			doc.appendChild(text);
	    			domBuilder.currentElement = text;
				}
				return;
			}
			if(tagStart>start){
				appendText(tagStart);
			}
			switch(source.charAt(tagStart+1)){
			case '/':
				var end = source.indexOf('>',tagStart+3);
				var tagName = source.substring(tagStart+2,end);
				var config = parseStack.pop();
				if(end<0){
					
	        		tagName = source.substring(tagStart+2).replace(/[\s<].*/,'');
	        		//console.error('#@@@@@@'+tagName)
	        		errorHandler.error("end tag name: "+tagName+' is not complete:'+config.tagName);
	        		end = tagStart+1+tagName.length;
	        	}else if(tagName.match(/\s</)){
	        		tagName = tagName.replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' maybe not complete');
	        		end = tagStart+1+tagName.length;
				}
				//console.error(parseStack.length,parseStack)
				//console.error(config);
				var localNSMap = config.localNSMap;
				var endMatch = config.tagName == tagName;
				var endIgnoreCaseMach = endMatch || config.tagName&&config.tagName.toLowerCase() == tagName.toLowerCase();
		        if(endIgnoreCaseMach){
		        	domBuilder.endElement(config.uri,config.localName,tagName);
					if(localNSMap){
						for(var prefix in localNSMap){
							domBuilder.endPrefixMapping(prefix) ;
						}
					}
					if(!endMatch){
		            	errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName ); // No known test case
					}
		        }else {
		        	parseStack.push(config);
		        }
				
				end++;
				break;
				// end elment
			case '?':// <?...?>
				locator&&position(tagStart);
				end = parseInstruction(source,tagStart,domBuilder);
				break;
			case '!':// <!doctype,<![CDATA,<!--
				locator&&position(tagStart);
				end = parseDCC(source,tagStart,domBuilder,errorHandler);
				break;
			default:
				locator&&position(tagStart);
				var el = new ElementAttributes();
				var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
				//elStartEnd
				var end = parseElementStartPart(source,tagStart,el,currentNSMap,entityReplacer,errorHandler);
				var len = el.length;
				
				
				if(!el.closed && fixSelfClosed(source,end,el.tagName,closeMap)){
					el.closed = true;
					if(!entityMap.nbsp){
						errorHandler.warning('unclosed xml attribute');
					}
				}
				if(locator && len){
					var locator2 = copyLocator(locator,{});
					//try{//attribute position fixed
					for(var i = 0;i<len;i++){
						var a = el[i];
						position(a.offset);
						a.locator = copyLocator(locator,{});
					}
					//}catch(e){console.error('@@@@@'+e)}
					domBuilder.locator = locator2;
					if(appendElement$1(el,domBuilder,currentNSMap)){
						parseStack.push(el);
					}
					domBuilder.locator = locator;
				}else {
					if(appendElement$1(el,domBuilder,currentNSMap)){
						parseStack.push(el);
					}
				}
				
				
				
				if(el.uri === 'http://www.w3.org/1999/xhtml' && !el.closed){
					end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder);
				}else {
					end++;
				}
			}
		}catch(e){
			if (e instanceof ParseError$1) {
				throw e;
			}
			errorHandler.error('element parse error: '+e);
			end = -1;
		}
		if(end>start){
			start = end;
		}else {
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(Math.max(tagStart,start)+1);
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,currentNSMap,entityReplacer,errorHandler){

	/**
	 * @param {string} qname
	 * @param {string} value
	 * @param {number} startIndex
	 */
	function addAttribute(qname, value, startIndex) {
		if (qname in el.attributeNames) errorHandler.fatalError('Attribute ' + qname + ' redefined');
		el.addValue(qname, value, startIndex);
	}
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_SPACE){
				s = S_EQ;
			}else {
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName'); // No known test case
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ || s === S_ATTR //|| s == S_ATTR_SPACE
				){//equal
				if(s === S_ATTR){
					errorHandler.warning('attribute value must after "="');
					attrName = source.slice(start,p);
				}
				start = p+1;
				p = source.indexOf(c,start);
				if(p>0){
					value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					addAttribute(attrName, value, start-1);
					s = S_ATTR_END;
				}else {
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_ATTR_NOQUOT_VALUE){
				value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
				//console.log(attrName,value,start,p)
				addAttribute(attrName, value, start);
				//console.dir(el)
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_ATTR_END;
			}else {
				//fatalError: no equal before
				throw new Error('attribute value must after "="'); // No known test case
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				s =S_TAG_CLOSE;
				el.closed = true;
			case S_ATTR_NOQUOT_VALUE:
			case S_ATTR:
			case S_ATTR_SPACE:
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')") // No known test case
			}
			break;
		case ''://end document
			errorHandler.error('unexpected end of input');
			if(s == S_TAG){
				el.setTagName(source.slice(start,p));
			}
			return p;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				break;//normal
			case S_ATTR_NOQUOT_VALUE://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1);
				}
			case S_ATTR_SPACE:
				if(s === S_ATTR_SPACE){
					value = attrName;
				}
				if(s == S_ATTR_NOQUOT_VALUE){
					errorHandler.warning('attribute "'+value+'" missed quot(")!');
					addAttribute(attrName, value.replace(/&#?\w+;/g,entityReplacer), start);
				}else {
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !value.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!');
					}
					addAttribute(value, value, start);
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_TAG_SPACE;
					break;
				case S_ATTR:
					attrName = source.slice(start,p);
					s = S_ATTR_SPACE;
					break;
				case S_ATTR_NOQUOT_VALUE:
					var value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					addAttribute(attrName, value, start);
				case S_ATTR_END:
					s = S_TAG_SPACE;
					break;
				//case S_TAG_SPACE:
				//case S_EQ:
				//case S_ATTR_SPACE:
				//	void();break;
				//case S_TAG_CLOSE:
					//ignore warning
				}
			}else {//not space
//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_ATTR_NOQUOT_VALUE:void();break;
				case S_ATTR_SPACE:
					el.tagName;
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !attrName.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead2!!');
					}
					addAttribute(attrName, attrName, start);
					start = p;
					s = S_ATTR;
					break;
				case S_ATTR_END:
					errorHandler.warning('attribute space is required"'+attrName+'"!!');
				case S_TAG_SPACE:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_ATTR_NOQUOT_VALUE;
					start = p;
					break;
				case S_TAG_CLOSE:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}//end outer switch
		//console.log('p++',p)
		p++;
	}
}
/**
 * @return true if has new namespace define
 */
function appendElement$1(el,domBuilder,currentNSMap){
	var tagName = el.tagName;
	var localNSMap = null;
	//var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName;
		}else {
			localName = qName;
			prefix = null;
			nsPrefix = qName === 'xmlns' && '';
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute 
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {};
				//console.log(currentNSMap,0)
				_copy(currentNSMap,currentNSMap={});
				//console.log(currentNSMap,1)
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = 'http://www.w3.org/2000/xmlns/';
			domBuilder.startPrefixMapping(nsPrefix, value); 
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = 'http://www.w3.org/XML/1998/namespace';
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix || ''];
				
				//{console.log('###'+a.qName,domBuilder.locator.systemId+'',currentNSMap,a.uri)}
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else {
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for(prefix in localNSMap){
				domBuilder.endPrefixMapping(prefix); 
			}
		}
	}else {
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		//parseStack.push(el);
		return true;
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}
			
		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos =  source.lastIndexOf('</'+tagName+'>');
		if(pos<elStartEnd){//忘记闭合
			pos = source.lastIndexOf('</'+tagName);
		}
		closeMap[tagName] =pos;
	}
	return pos<elStartEnd;
	//} 
}
function _copy(source,target){
	for(var n in source){target[n] = source[n];}
}
function parseDCC(source,start,domBuilder,errorHandler){//sure start with '<!'
	var next= source.charAt(start+2);
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			if(end>start){
				domBuilder.comment(source,start+4,end-start-4);
				return end+3;
			}else {
				errorHandler.error("Unclosed comment");
				return -1;
			}
		}else {
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA(); 
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId) 
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = false;
			var sysid = false;
			if(len>3){
				if(/^public$/i.test(matchs[2][0])){
					pubid = matchs[3][0];
					sysid = len>4 && matchs[4][0];
				}else if(/^system$/i.test(matchs[2][0])){
					sysid = matchs[3][0];
				}
			}
			var lastMatch = matchs[len-1];
			domBuilder.startDTD(name, pubid, sysid);
			domBuilder.endDTD();
			
			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else {//error
			return -1;
		}
	}
	return -1;
}

function ElementAttributes(){
	this.attributeNames = {};
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName;
	},
	addValue:function(qName, value, offset) {
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this.attributeNames[qName] = this.length;
		this[this.length++] = {qName:qName,value:value,offset:offset};
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getLocator:function(i){return this[i].locator},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//			
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
};



function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

sax$1.XMLReader = XMLReader$1;
sax$1.ParseError = ParseError$1;

var dom = {};

function copy(src,dest){
	for(var p in src){
		dest[p] = src[p];
	}
}
/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(!(pt instanceof Super)){
		function t(){}		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknow Class:"+Class);
		}
		pt.constructor = Class;
	}
}
var htmlns = 'http://www.w3.org/1999/xhtml' ;
// Node Types
var NodeType = {};
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {};
var ExceptionMessage = {};
ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);

/**
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 */
function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else {
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
}DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException);
/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
}NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0, 
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long 
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index. 
	 */
	item: function(index) {
		return this[index] || null;
	},
	toString:function(isHTML,nodeFilter){
		for(var buf = [], i = 0;i<this.length;i++){
			serializeToString(this[i],buf,isHTML,nodeFilter);
		}
		return buf.join('');
	}
};
function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh;
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
};

_extends(LiveNodeList,NodeList);
/**
 * 
 * Objects implementing the NamedNodeMap interface are used to represent collections of nodes that can be accessed by name. Note that NamedNodeMap does not inherit from NodeList; NamedNodeMaps are not maintained in any particular order. Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index, but this is simply to allow convenient enumeration of the contents of a NamedNodeMap, and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities 
 */
function NamedNodeMap() {
}
function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else {
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	//console.log('remove attr:'+attr)
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1;
		while(i<lastIndex){
			list[i] = list[++i];
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else {
		throw DOMException(NOT_FOUND_ERR,new Error(el.tagName+'@'+attr))
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		//console.log()
		var i = this.length;
		while(i--){
			var attr = this[i];
			//console.log(attr.nodeName,key)
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
		
		
	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR
	
	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};
/**
 * @see http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490
 */
function DOMImplementation$1(/* Object */ features) {
	this._features = {};
	if (features) {
		for (var feature in features) {
			 this._features = features[feature];
		}
	}
}
DOMImplementation$1.prototype = {
	hasFeature: function(/* string */ feature, /* string */ version) {
		var versions = this._features[feature.toLowerCase()];
		if (versions && (!version || version in versions)) {
			return true;
		} else {
			return false;
		}
	},
	// Introduced in DOM Level 2:
	createDocument:function(namespaceURI,  qualifiedName, doctype){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR,WRONG_DOCUMENT_ERR
		var doc = new Document();
		doc.implementation = this;
		doc.childNodes = new NodeList();
		doc.doctype = doctype;
		if(doctype){
			doc.appendChild(doctype);
		}
		if(qualifiedName){
			var root = doc.createElementNS(namespaceURI,qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	// Introduced in DOM Level 2:
	createDocumentType:function(qualifiedName, publicId, systemId){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId;
		node.systemId = systemId;
		// Introduced in DOM Level 2:
		//readonly attribute DOMString        internalSubset;
		
		//TODO:..
		//  readonly attribute NamedNodeMap     entities;
		//  readonly attribute NamedNodeMap     notations;
		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node() {
}
Node.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises 
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises 
		this.insertBefore(newChild,oldChild);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else {
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
    				if(map[n] == namespaceURI){
    					return n;
    				}
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(prefix in map){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node);
copy(NodeType,Node.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
}
function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value;
	}
}
function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:''];
	}
}
function _onUpdateChild(doc,el,newChild){
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if(newChild){
			cs[cs.length++] = newChild;
		}else {
			//console.log(1)
			var child = el.firstChild;
			var i = 0;
			while(child){
				cs[i++] = child;
				child =child.nextSibling;
			}
			cs.length = i;
		}
	}
}

/**
 * attributes;
 * children;
 * 
 * writeable properties:
 * nodeValue,Attr:value,CharacterData:data
 * prefix
 */
function _removeChild(parentNode,child){
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if(previous){
		previous.nextSibling = next;
	}else {
		parentNode.firstChild = next;
	}
	if(next){
		next.previousSibling = previous;
	}else {
		parentNode.lastChild = previous;
	}
	_onUpdateChild(parentNode.ownerDocument,parentNode);
	return child;
}
/**
 * preformance key(refChild == null)
 */
function _insertBefore(parentNode,newChild,nextChild){
	var cp = newChild.parentNode;
	if(cp){
		cp.removeChild(newChild);//remove and update
	}
	if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = newChild.firstChild;
		if (newFirst == null) {
			return newChild;
		}
		var newLast = newChild.lastChild;
	}else {
		newFirst = newLast = newChild;
	}
	var pre = nextChild ? nextChild.previousSibling : parentNode.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = nextChild;
	
	
	if(pre){
		pre.nextSibling = newFirst;
	}else {
		parentNode.firstChild = newFirst;
	}
	if(nextChild == null){
		parentNode.lastChild = newLast;
	}else {
		nextChild.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parentNode;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parentNode.ownerDocument||parentNode,parentNode);
	//console.log(parentNode.lastChild.nextSibling == null)
	if (newChild.nodeType == DOCUMENT_FRAGMENT_NODE) {
		newChild.firstChild = newChild.lastChild = null;
	}
	return newChild;
}
function _appendSingleChild(parentNode,newChild){
	var cp = newChild.parentNode;
	if(cp){
		var pre = parentNode.lastChild;
		cp.removeChild(newChild);//remove and update
		var pre = parentNode.lastChild;
	}
	var pre = parentNode.lastChild;
	newChild.parentNode = parentNode;
	newChild.previousSibling = pre;
	newChild.nextSibling = null;
	if(pre){
		pre.nextSibling = newChild;
	}else {
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument,parentNode,newChild);
	return newChild;
	//console.log("__aa",parentNode.lastChild.nextSibling == null)
}
Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	doctype :  null,
	documentElement :  null,
	_inc : 1,
	
	insertBefore :  function(newChild, refChild){//raises 
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		if(this.documentElement == null && newChild.nodeType == ELEMENT_NODE){
			this.documentElement = newChild;
		}
		
		return _insertBefore(this,newChild,refChild),(newChild.ownerDocument = this),newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == ELEMENT_NODE){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		});
		return rtv;
	},
	
	getElementsByClassName: function(className) {
		var pattern = new RegExp("(^|\\s)" + className + "(\\s|$)");
		return new LiveNodeList(this, function(base) {
			var ls = [];
			_visitNode(base.documentElement, function(node) {
				if(node !== base && node.nodeType == ELEMENT_NODE) {
					if(pattern.test(node.getAttribute('class'))) {
						ls.push(node);
					}
				}
			});
			return ls;
		});
	},
	
	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data);
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data);
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data);
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else {
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else {
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node);


function Element() {
	this._nsMap = {};
}Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr);
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name);
		attr && this.removeAttributeNode(attr);
	},
	
	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else {
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		//console.log(this == oldAttr.ownerElement)
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},
	
	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr);
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},
	
	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === '*' || node.namespaceURI === namespaceURI) && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;
			
		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node);
function Attr() {
}Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node);


function CharacterData() {
}CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);
	
	},
	appendChild:function(newChild){
		throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR])
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
};
_extends(CharacterData,Node);
function Text() {
}Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
};
_extends(Text,CharacterData);
function Comment() {
}Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
};
_extends(Comment,CharacterData);

function CDATASection() {
}CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
};
_extends(CDATASection,CharacterData);


function DocumentType() {
}DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node);

function Notation() {
}Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node);

function Entity() {
}Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node);

function EntityReference() {
}EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node);

function DocumentFragment() {
}DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node,isHtml,nodeFilter){
	return nodeSerializeToString.call(node,isHtml,nodeFilter);
};
Node.prototype.toString = nodeSerializeToString;
function nodeSerializeToString(isHtml,nodeFilter){
	var buf = [];
	var refNode = this.nodeType == 9 && this.documentElement || this;
	var prefix = refNode.prefix;
	var uri = refNode.namespaceURI;
	
	if(uri && prefix == null){
		//console.log(prefix)
		var prefix = refNode.lookupPrefix(uri);
		if(prefix == null){
			//isHTML = true;
			var visibleNamespaces=[
			{namespace:uri,prefix:null}
			//{namespace:uri,prefix:''}
			];
		}
	}
	serializeToString(this,buf,isHtml,nodeFilter,visibleNamespaces);
	//console.log('###',this.nodeType,uri,prefix,buf.join(''))
	return buf.join('');
}
function needNamespaceDefine(node,isHTML, visibleNamespaces) {
	var prefix = node.prefix||'';
	var uri = node.namespaceURI;
	if (!prefix && !uri){
		return false;
	}
	if (prefix === "xml" && uri === "http://www.w3.org/XML/1998/namespace" 
		|| uri == 'http://www.w3.org/2000/xmlns/'){
		return false;
	}
	
	var i = visibleNamespaces.length; 
	//console.log('@@@@',node.tagName,prefix,uri,visibleNamespaces)
	while (i--) {
		var ns = visibleNamespaces[i];
		// get namespace prefix
		//console.log(node.nodeType,node.tagName,ns.prefix,prefix)
		if (ns.prefix == prefix){
			return ns.namespace != uri;
		}
	}
	//console.log(isHTML,uri,prefix=='')
	//if(isHTML && prefix ==null && uri == 'http://www.w3.org/1999/xhtml'){
	//	return false;
	//}
	//node.flag = '11111'
	//console.error(3,true,node.flag,node.prefix,node.namespaceURI)
	return true;
}
function serializeToString(node,buf,isHTML,nodeFilter,visibleNamespaces){
	if(nodeFilter){
		node = nodeFilter(node);
		if(node){
			if(typeof node == 'string'){
				buf.push(node);
				return;
			}
		}else {
			return;
		}
		//buf.sort.apply(attrs, attributeSorter);
	}
	switch(node.nodeType){
	case ELEMENT_NODE:
		if (!visibleNamespaces) visibleNamespaces = [];
		visibleNamespaces.length;
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;
		
		isHTML =  (htmlns === node.namespaceURI) ||isHTML; 
		buf.push('<',nodeName);
		
		
		
		for(var i=0;i<len;i++){
			// add namespaces for attributes
			var attr = attrs.item(i);
			if (attr.prefix == 'xmlns') {
				visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
			}else if(attr.nodeName == 'xmlns'){
				visibleNamespaces.push({ prefix: '', namespace: attr.value });
			}
		}
		for(var i=0;i<len;i++){
			var attr = attrs.item(i);
			if (needNamespaceDefine(attr,isHTML, visibleNamespaces)) {
				var prefix = attr.prefix||'';
				var uri = attr.namespaceURI;
				var ns = prefix ? ' xmlns:' + prefix : " xmlns";
				buf.push(ns, '="' , uri , '"');
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
			serializeToString(attr,buf,isHTML,nodeFilter,visibleNamespaces);
		}
		// add namespace for current node		
		if (needNamespaceDefine(node,isHTML, visibleNamespaces)) {
			var prefix = node.prefix||'';
			var uri = node.namespaceURI;
			var ns = prefix ? ' xmlns:' + prefix : " xmlns";
			buf.push(ns, '="' , uri , '"');
			visibleNamespaces.push({ prefix: prefix, namespace:uri });
		}
		
		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				while(child){
					if(child.data){
						buf.push(child.data);
					}else {
						serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					}
					child = child.nextSibling;
				}
			}else
			{
				while(child){
					serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					child = child.nextSibling;
				}
			}
			buf.push('</',nodeName,'>');
		}else {
			buf.push('/>');
		}
		// remove added visible namespaces
		//visibleNamespaces.length = startVisibleNamespaces;
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		return buf.push(' ',node.name,'="',node.value.replace(/[&"]/g,_xmlEncoder),'"');
	case TEXT_NODE:
		/**
		 * The ampersand character (&) and the left angle bracket (<) must not appear in their literal form,
		 * except when used as markup delimiters, or within a comment, a processing instruction, or a CDATA section.
		 * If they are needed elsewhere, they must be escaped using either numeric character references or the strings
		 * `&amp;` and `&lt;` respectively.
		 * The right angle bracket (>) may be represented using the string " &gt; ", and must, for compatibility,
		 * be escaped using either `&gt;` or a character reference when it appears in the string `]]>` in content,
		 * when that string is not marking the end of a CDATA section.
		 *
		 * In the content of elements, character data is any string of characters
		 * which does not contain the start-delimiter of any markup
		 * and does not include the CDATA-section-close delimiter, `]]>`.
		 *
		 * @see https://www.w3.org/TR/xml/#NT-CharData
		 */
		return buf.push(node.data
			.replace(/[<&]/g,_xmlEncoder)
			.replace(/]]>/g, ']]&gt;')
		);
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC ', pubid);
			if (sysid && sysid!='.') {
				buf.push(' ', sysid);
			}
			buf.push('>');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM ', sysid, '>');
		}else {
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		//var attrs = node2.attributes;
		//var len = attrs.length;
		//for(var i=0;i<len;i++){
			//node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		//}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for(var n in node){
		var v = node[n];
		if(typeof v != 'object' ){
			if(v != node2[n]){
				node2[n] = v;
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length;
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value;
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});
		Object.defineProperty(Node.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},
			set:function(data){
				switch(this.nodeType){
				case ELEMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;
				default:
					//TODO:
					this.data = data;
					this.value = data;
					this.nodeValue = data;
				}
			}
		});
		
		function getTextContent(node){
			switch(node.nodeType){
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}
		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value;
		};
	}
}catch(e){//ie8
}

//if(typeof require == 'function'){
	dom.Node = Node;
	dom.DOMException = DOMException;
	dom.DOMImplementation = DOMImplementation$1;
	dom.XMLSerializer = XMLSerializer;

function DOMParser$1(options){
	this.options = options ||{locator:{}};
}

DOMParser$1.prototype.parseFromString = function(source,mimeType){
	var options = this.options;
	var sax =  new XMLReader();
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = options.xmlns||{};
	var isHTML = /\/x?html?$/.test(mimeType);//mimeType.toLowerCase().indexOf('html') > -1;
  	var entityMap = isHTML?htmlEntity.entityMap:{'lt':'<','gt':'>','amp':'&','quot':'"','apos':"'"};
	if(locator){
		domBuilder.setDocumentLocator(locator);
	}

	sax.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax.domBuilder = options.domBuilder || domBuilder;
	if(isHTML){
		defaultNSMap['']= 'http://www.w3.org/1999/xhtml';
	}
	defaultNSMap.xml = defaultNSMap.xml || 'http://www.w3.org/XML/1998/namespace';
	if(source && typeof source === 'string'){
		sax.parse(source,defaultNSMap,entityMap);
	}else {
		sax.errorHandler.error("invalid doc source");
	}
	return domBuilder.doc;
};
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {};
	var isCallback = errorImpl instanceof Function;
	locator = locator||{};
	function build(key){
		var fn = errorImpl[key];
		if(!fn && isCallback){
			fn = errorImpl.length == 2?function(msg){errorImpl(key,msg);}:errorImpl;
		}
		errorHandler[key] = fn && function(msg){
			fn('[xmldom '+key+']\t'+msg+_locator(locator));
		}||function(){};
	}
	build('warning');
	build('error');
	build('fatalError');
	return errorHandler;
}

//console.log('#\n\n\n\n\n\n\n####')
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler
 *
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */
DOMHandler.prototype = {
	startDocument : function() {
    	this.doc = new DOMImplementation().createDocument(null, null, null);
    	if (this.locator) {
        	this.doc.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.doc;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement(this, el);
	    this.currentElement = el;

		this.locator && position(this.locator,el);
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			this.locator &&position(attrs.getLocator(i),attr);
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr);
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement;
		current.tagName;
		this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.doc.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins);
	    appendElement(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments);
		//console.log(chars)
		if(chars){
			if (this.cdata) {
				var charNode = this.doc.createCDATASection(chars);
			} else {
				var charNode = this.doc.createTextNode(chars);
			}
			if(this.currentElement){
				this.currentElement.appendChild(charNode);
			}else if(/^\s*$/.test(chars)){
				this.doc.appendChild(charNode);
				//process xml
			}
			this.locator && position(this.locator,charNode);
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.doc.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments);
	    var comm = this.doc.createComment(chars);
	    this.locator && position(this.locator,comm);
	    appendElement(this, comm);
	},

	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},

	startDTD:function(name, publicId, systemId) {
		var impl = this.doc.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt);
	        appendElement(this, dt);
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn('[xmldom warning]\t'+error,_locator(this.locator));
	},
	error:function(error) {
		console.error('[xmldom error]\t'+error,_locator(this.locator));
	},
	fatalError:function(error) {
		throw new ParseError(error, this.locator);
	}
};
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else {//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null};
});

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement (hander,node) {
    if (!hander.currentElement) {
        hander.doc.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

//if(typeof require == 'function'){
var htmlEntity = entities;
var sax = sax$1;
var XMLReader = sax.XMLReader;
var ParseError = sax.ParseError;
var DOMImplementation = domParser.DOMImplementation = dom.DOMImplementation;
domParser.XMLSerializer = dom.XMLSerializer ;
domParser.DOMParser = DOMParser$1;
domParser.__DOMHandler = DOMHandler;

/**
 * @file DOM解析器，兼容node端和浏览器端
 * @author mengke01(kekee000@gmail.com)
 */

/* eslint-disable no-undef */
var DOMParser = typeof window !== 'undefined' && window.DOMParser
    ? window.DOMParser
    : domParser.DOMParser;

/**
 * @file 使用插值法获取椭圆弧度，以支持svg arc命令
 * @author mengke01(kekee000@gmail.com)
 *
 * modify from:
 * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
 * references:
 * http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
 */


const TAU = Math.PI * 2;

function vectorAngle(ux, uy, vx, vy) {
    // Calculate an angle between two vectors
    const sign = (ux * vy - uy * vx < 0) ? -1 : 1;
    const umag = Math.sqrt(ux * ux + uy * uy);
    const vmag = Math.sqrt(ux * ux + uy * uy);
    const dot = ux * vx + uy * vy;
    let div = dot / (umag * vmag);

    if (div > 1 || div < -1) {
        // rounding errors, e.g. -1.0000000000000002 can screw up this
        div = Math.max(div, -1);
        div = Math.min(div, 1);
    }

    return sign * Math.acos(div);
}

function correctRadii(midx, midy, rx, ry) {
    // Correction of out-of-range radii
    rx = Math.abs(rx);
    ry = Math.abs(ry);

    const Λ = (midx * midx) / (rx * rx) + (midy * midy) / (ry * ry);
    if (Λ > 1) {
        rx *= Math.sqrt(Λ);
        ry *= Math.sqrt(Λ);
    }

    return [rx, ry];
}


function getArcCenter(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ) {
    // Convert from endpoint to center parameterization,
    // see http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes

    // Step 1.
    //
    // Moving an ellipse so origin will be the middlepoint between our two
    // points. After that, rotate it to line up ellipse axes with coordinate
    // axes.
    //
    const x1p = cos_φ * (x1 - x2) / 2 + sin_φ * (y1 - y2) / 2;
    const y1p = -sin_φ * (x1 - x2) / 2 + cos_φ * (y1 - y2) / 2;

    const rx_sq = rx * rx;
    const ry_sq = ry * ry;
    const x1p_sq = x1p * x1p;
    const y1p_sq = y1p * y1p;

    // Step 2.
    //
    // Compute coordinates of the centre of this ellipse (cx', cy')
    // in the new coordinate system.
    //
    let radicant = (rx_sq * ry_sq) - (rx_sq * y1p_sq) - (ry_sq * x1p_sq);

    if (radicant < 0) {
        // due to rounding errors it might be e.g. -1.3877787807814457e-17
        radicant = 0;
    }

    radicant /= (rx_sq * y1p_sq) + (ry_sq * x1p_sq);
    radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);

    const cxp = radicant * rx / ry * y1p;
    const cyp = radicant * -ry / rx * x1p;

    // Step 3.
    //
    // Transform back to get centre coordinates (cx, cy) in the original
    // coordinate system.
    //
    const cx = cos_φ * cxp - sin_φ * cyp + (x1 + x2) / 2;
    const cy = sin_φ * cxp + cos_φ * cyp + (y1 + y2) / 2;

    // Step 4.
    //
    // Compute angles (θ1, Δθ).
    //
    const v1x = (x1p - cxp) / rx;
    const v1y = (y1p - cyp) / ry;
    const v2x = (-x1p - cxp) / rx;
    const v2y = (-y1p - cyp) / ry;

    const θ1 = vectorAngle(1, 0, v1x, v1y);
    let Δθ = vectorAngle(v1x, v1y, v2x, v2y);

    if (fs === 0 && Δθ > 0) {
        Δθ -= TAU;
    }
    if (fs === 1 && Δθ < 0) {
        Δθ += TAU;
    }

    return [cx, cy, θ1, Δθ];
}

function approximateUnitArc(θ1, Δθ) {
    // Approximate one unit arc segment with bézier curves,
    // see http://math.stackexchange.com/questions/873224/
    //      calculate-control-points-of-cubic-bezier-curve-approximating-a-part-of-a-circle
    const α = 4 / 3 * Math.tan(Δθ / 4);

    const x1 = Math.cos(θ1);
    const y1 = Math.sin(θ1);
    const x2 = Math.cos(θ1 + Δθ);
    const y2 = Math.sin(θ1 + Δθ);

    return [x1, y1, x1 - y1 * α, y1 + x1 * α, x2 + y2 * α, y2 - x2 * α, x2, y2];
}


function a2c(x1, y1, x2, y2, fa, fs, rx, ry, φ) {
    const sin_φ = Math.sin(φ * TAU / 360);
    const cos_φ = Math.cos(φ * TAU / 360);

    // Make sure radii are valid
    //
    const x1p = cos_φ * (x1 - x2) / 2 + sin_φ * (y1 - y2) / 2;
    const y1p = -sin_φ * (x1 - x2) / 2 + cos_φ * (y1 - y2) / 2;

    if (x1p === 0 && y1p === 0) {
        // we're asked to draw line to itself
        return [];
    }

    if (rx === 0 || ry === 0) {
        // one of the radii is zero
        return [];
    }

    const radii = correctRadii(x1p, y1p, rx, ry);
    rx = radii[0];
    ry = radii[1];

    // Get center parameters (cx, cy, θ1, Δθ)
    //
    const cc = getArcCenter(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ);

    const result = [];
    let θ1 = cc[2];
    let Δθ = cc[3];

    // Split an arc to multiple segments, so each segment
    // will be less than τ/4 (= 90°)
    //
    const segments = Math.max(Math.ceil(Math.abs(Δθ) / (TAU / 4)), 1);
    Δθ /= segments;

    for (let i = 0; i < segments; i++) {
        result.push(approximateUnitArc(θ1, Δθ));
        θ1 += Δθ;
    }

    // We have a bezier approximation of a unit circle,
    // now need to transform back to the original ellipse
    //
    return result.map(curve => {
        for (let i = 0; i < curve.length; i += 2) {
            let x = curve[i + 0];
            let y = curve[i + 1];

            // scale
            x *= rx;
            y *= ry;

            // rotate
            const xp = cos_φ * x - sin_φ * y;
            const yp = sin_φ * x + cos_φ * y;

            // translate
            curve[i + 0] = xp + cc[0];
            curve[i + 1] = yp + cc[1];
        }

        return curve;
    });
}

/**
 * 获取椭圆弧度
 *
 * @param {number} rx 椭圆长半轴
 * @param {number} ry 椭圆短半轴
 * @param {number} angle 旋转角度
 * @param {number} largeArc 是否大圆弧
 * @param {number} sweep 是否延伸圆弧
 * @param {Object} p0 分割点1
 * @param {Object} p1 分割点2
 * @return {Array} 分割后的路径
 */
function getArc(rx, ry, angle, largeArc, sweep, p0, p1) {
    const result = a2c(p0.x, p0.y, p1.x, p1.y, largeArc, sweep, rx, ry, angle);
    const path = [];

    if (result.length) {
        path.push({
            x: result[0][0],
            y: result[0][1],
            onCurve: true
        });

        // 将三次曲线转换成二次曲线
        result.forEach(c => {
            const q2Array = bezierCubic2Q2({
                x: c[0],
                y: c[1]
            }, {
                x: c[2],
                y: c[3]
            }, {
                x: c[4],
                y: c[5]
            }, {
                x: c[6],
                y: c[7]
            });

            q2Array[0][2].onCurve = true;
            path.push(q2Array[0][1]);
            path.push(q2Array[0][2]);
            if (q2Array[1]) {
                q2Array[1][2].onCurve = true;
                path.push(q2Array[1][1]);
                path.push(q2Array[1][2]);
            }
        });
    }

    return path;
}

/**
 * @file 解析参数数组
 * @author mengke01(kekee000@gmail.com)
 */

const SEGMENT_REGEX = /-?\d+(?:\.\d+)?(?:e[-+]?\d+)?\b/g;

/**
 * 获取参数值
 *
 * @param  {string} d 参数
 * @return {number}   参数值
 */
function getSegment(d) {
    return +d.trim();
}

/**
 * 解析参数数组
 *
 * @param  {string} str 参数字符串
 * @return {Array}   参数数组
 */
function parseParams (str) {
    if (!str) {
        return [];
    }
    const matchs = str.match(SEGMENT_REGEX);
    return matchs ? matchs.map(getSegment) : [];
}

/**
 * @file svg path转换为轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 三次贝塞尔曲线，转二次贝塞尔曲线
 *
 * @param {Array} cubicList 三次曲线数组
 * @param {Array} contour 当前解析后的轮廓数组
 * @return {Array} 当前解析后的轮廓数组
 */
function cubic2Points(cubicList, contour) {

    let i;
    let l;
    const q2List = [];

    cubicList.forEach(c => {
        const list = bezierCubic2Q2(c[0], c[1], c[2], c[3]);
        for (i = 0, l = list.length; i < l; i++) {
            q2List.push(list[i]);
        }
    });

    let q2;
    let prevq2;
    for (i = 0, l = q2List.length; i < l; i++) {
        q2 = q2List[i];
        if (i === 0) {
            contour.push({
                x: q2[1].x,
                y: q2[1].y
            });
            contour.push({
                x: q2[2].x,
                y: q2[2].y,
                onCurve: true
            });
        }
        else {
            prevq2 = q2List[i - 1];
            // 检查是否存在切线点
            if (
                prevq2[1].x + q2[1].x === 2 * q2[0].x
                && prevq2[1].y + q2[1].y === 2 * q2[0].y
            ) {
                contour.pop();
            }
            contour.push({
                x: q2[1].x,
                y: q2[1].y
            });
            contour.push({
                x: q2[2].x,
                y: q2[2].y,
                onCurve: true
            });
        }
    }

    contour.push({
        x: q2[2].x,
        y: q2[2].y,
        onCurve: true
    });

    return contour;
}


/**
 * svg 命令数组转轮廓
 *
 * @param {Array} segments svg 命令数组
 * @return {Array} 轮廓数组
 */
function segments2Contours(segments) {

    // 解析segments
    const contours = [];
    let contour = [];
    let prevX = 0;
    let prevY = 0;
    let segment;
    let args;
    let cmd;
    let relative;
    let q;
    let ql;
    let px;
    let py;
    let cubicList;
    let p1;
    let p2;
    let c1;
    let c2;
    let prevCubicC1; // 三次贝塞尔曲线前一个控制点，用于绘制`s`命令

    for (let i = 0, l = segments.length; i < l; i++) {
        segment = segments[i];
        cmd = segment.cmd;
        relative = segment.relative;
        args = segment.args;

        if (args && !args.length && cmd !== 'Z') {
            console.warn('`' + cmd + '` command args empty!');
            continue;
        }

        if (cmd === 'Z') {
            contours.push(contour);
            contour = [];
        }
        else if (cmd === 'M' || cmd === 'L') {
            if (args.length % 2) {
                throw new Error('`M` command error:' + args.join(','));
            }

            // 这里可能会连续绘制，最后一个是终点
            if (relative) {
                px = prevX;
                py = prevY;
            }
            else {
                px = 0;
                py = 0;
            }

            for (q = 0, ql = args.length; q < ql; q += 2) {

                if (relative) {
                    px += args[q];
                    py += args[q + 1];
                }
                else {
                    px = args[q];
                    py = args[q + 1];
                }

                contour.push({
                    x: px,
                    y: py,
                    onCurve: true
                });
            }

            prevX = px;
            prevY = py;
        }
        else if (cmd === 'H') {
            if (relative) {
                prevX += args[0];
            }
            else {
                prevX = args[0];
            }

            contour.push({
                x: prevX,
                y: prevY,
                onCurve: true
            });
        }
        else if (cmd === 'V') {
            if (relative) {
                prevY += args[0];
            }
            else {
                prevY = args[0];
            }

            contour.push({
                x: prevX,
                y: prevY,
                onCurve: true
            });
        }
        // 二次贝塞尔
        else if (cmd === 'Q') {
            // 这里可能会连续绘制，最后一个是终点
            if (relative) {
                px = prevX;
                py = prevY;
            }
            else {
                px = 0;
                py = 0;
            }

            for (q = 0, ql = args.length; q < ql; q += 4) {

                contour.push({
                    x: px + args[q],
                    y: py + args[q + 1]
                });
                contour.push({
                    x: px + args[q + 2],
                    y: py + args[q + 3],
                    onCurve: true
                });

                if (relative) {
                    px += args[q + 2];
                    py += args[q + 3];
                }
                else {
                    px = 0;
                    py = 0;
                }
            }

            if (relative) {
                prevX = px;
                prevY = py;
            }
            else {
                prevX = args[ql - 2];
                prevY = args[ql - 1];
            }
        }
        // 二次贝塞尔平滑
        else if (cmd === 'T') {
            // 这里需要移除上一个曲线的终点
            let last = contour.pop();
            let pc = contour[contour.length - 1];
            if (!pc) {
                pc = last;
            }

            contour.push(pc = {
                x: 2 * last.x - pc.x,
                y: 2 * last.y - pc.y
            });

            px = prevX;
            py = prevY;

            for (q = 0, ql = args.length - 2; q < ql; q += 2) {

                if (relative) {
                    px += args[q];
                    py += args[q + 1];
                }
                else {
                    px = args[q];
                    py = args[q + 1];
                }

                last = {
                    x: px,
                    y: py
                };

                contour.push(pc = {
                    x: 2 * last.x - pc.x,
                    y: 2 * last.y - pc.y
                });
            }

            if (relative) {
                prevX = px + args[ql];
                prevY = py + args[ql + 1];
            }
            else {
                prevX = args[ql];
                prevY = args[ql + 1];
            }

            contour.push({
                x: prevX,
                y: prevY,
                onCurve: true
            });

        }
        // 三次贝塞尔
        else if (cmd === 'C') {
            if (args.length % 6) {
                throw new Error('`C` command params error:' + args.join(','));
            }

            // 这里可能会连续绘制，最后一个是终点
            cubicList = [];

            if (relative) {
                px = prevX;
                py = prevY;
            }
            else {
                px = 0;
                py = 0;
            }

            p1 = {
                x: prevX,
                y: prevY
            };

            for (q = 0, ql = args.length; q < ql; q += 6) {

                c1 = {
                    x: px + args[q],
                    y: py + args[q + 1]
                };

                c2 = {
                    x: px + args[q + 2],
                    y: py + args[q + 3]
                };

                p2 = {
                    x: px + args[q + 4],
                    y: py + args[q + 5]
                };

                cubicList.push([p1, c1, c2, p2]);

                p1 = p2;

                if (relative) {
                    px += args[q + 4];
                    py += args[q + 5];
                }
                else {
                    px = 0;
                    py = 0;
                }
            }

            if (relative) {
                prevX = px;
                prevY = py;
            }
            else {
                prevX = args[ql - 2];
                prevY = args[ql - 1];
            }

            cubic2Points(cubicList, contour);
            prevCubicC1 = cubicList[cubicList.length - 1][2];
        }
        // 三次贝塞尔平滑
        else if (cmd === 'S') {
            if (args.length % 4) {
                throw new Error('`S` command params error:' + args.join(','));
            }

            // 这里可能会连续绘制，最后一个是终点
            cubicList = [];

            if (relative) {
                px = prevX;
                py = prevY;
            }
            else {
                px = 0;
                py = 0;
            }

            // 这里需要移除上一个曲线的终点
            p1 = contour.pop();
            if (!prevCubicC1) {
                prevCubicC1 = p1;
            }

            c1 = {
                x: 2 * p1.x - prevCubicC1.x,
                y: 2 * p1.y - prevCubicC1.y
            };

            for (q = 0, ql = args.length; q < ql; q += 4) {

                c2 = {
                    x: px + args[q],
                    y: py + args[q + 1]
                };

                p2 = {
                    x: px + args[q + 2],
                    y: py + args[q + 3]
                };

                cubicList.push([p1, c1, c2, p2]);

                p1 = p2;

                c1 = {
                    x: 2 * p1.x - c2.x,
                    y: 2 * p1.y - c2.y
                };

                if (relative) {
                    px += args[q + 2];
                    py += args[q + 3];
                }
                else {
                    px = 0;
                    py = 0;
                }
            }

            if (relative) {
                prevX = px;
                prevY = py;
            }
            else {
                prevX = args[ql - 2];
                prevY = args[ql - 1];
            }

            cubic2Points(cubicList, contour);
            prevCubicC1 = cubicList[cubicList.length - 1][2];
        }
        // 求弧度, rx, ry, angle, largeArc, sweep, ex, ey
        else if (cmd === 'A') {
            if (args.length % 7) {
                throw new Error('arc command params error:' + args.join(','));
            }

            for (q = 0, ql = args.length; q < ql; q += 7) {
                let ex = args[q + 5];
                let ey = args[q + 6];

                if (relative) {
                    ex = prevX + ex;
                    ey = prevY + ey;
                }

                const path = getArc(
                    args[q], args[q + 1],
                    args[q + 2], args[q + 3], args[q + 4],
                    {x: prevX, y: prevY},
                    {x: ex, y: ey}
                );

                if (path && path.length > 1) {
                    for (let r = 1, rl = path.length; r < rl; r++) {
                        contour.push(path[r]);
                    }
                }
                prevX = ex;
                prevY = ey;
            }
        }
    }

    return contours;
}

/**
 * svg path转轮廓
 *
 * @param {string} path svg的path字符串
 * @return {Array} 转换后的轮廓
 */
function path2contours(path) {

    if (!path || !path.length) {
        return null;
    }

    path = path.trim();

    // 修正头部不为`m`的情况
    if (path[0] !== 'M' && path[0] !== 'm') {
        path = 'M 0 0' + path;
    }

    // 修复中间没有结束符`z`的情况
    path = path.replace(/(\d+)\s*(m|$)/gi, '$1z$2');

    // 获取segments
    const segments = [];
    let cmd;
    let relative = false;
    let lastIndex;
    let args;

    for (let i = 0, l = path.length; i < l; i++) {
        const c = path[i].toUpperCase();
        const r = c !== path[i];

        switch (c) {
        case 'M':
            /* jshint -W086 */
            if (i === 0) {
                cmd = c;
                lastIndex = 1;
                break;
            }
        // eslint-disable-next-line no-fallthrough
        case 'Q':
        case 'T':
        case 'C':
        case 'S':
        case 'H':
        case 'V':
        case 'L':
        case 'A':
        case 'Z':
            if (cmd === 'Z') {
                segments.push({cmd: 'Z'});
            }
            else {
                args = path.slice(lastIndex, i);
                segments.push({
                    cmd,
                    relative,
                    args: parseParams(args)
                });
            }

            cmd = c;
            relative = r;
            lastIndex = i + 1;
            break;

        }
    }

    segments.push({cmd: 'Z'});

    return segments2Contours(segments);
}

/**
 * @file 圆路径集合，逆时针
 * @author mengke01(kekee000@gmail.com)
 */

var circlePath = [
    {
        x: 582,
        y: 0
    },
    {
        x: 758,
        y: 75
    },
    {
        x: 890,
        y: 208
    },
    {
        x: 965,
        y: 384
    },
    {
        x: 965,
        y: 583
    },
    {
        x: 890,
        y: 760
    },
    {
        x: 758,
        y: 891
    },
    {
        x: 582,
        y: 966
    },
    {
        x: 383,
        y: 966
    },
    {
        x: 207,
        y: 891
    },
    {
        x: 75,
        y: 760
    },
    {
        x: 0,
        y: 583
    },
    {
        x: 0,
        y: 384
    },
    {
        x: 75,
        y: 208
    },
    {
        x: 207,
        y: 75
    },
    {
        x: 383,
        y: 0
    }
];

/**
 * @file 椭圆转换成轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 椭圆转换成轮廓
 *
 * @param {number} cx 椭圆中心点x
 * @param {number} cy 椭圆中心点y
 * @param {number} rx 椭圆x轴半径
 * @param {number} ry 椭圆y周半径
 * @return {Array} 轮廓数组
 */
function oval2contour(cx, cy, rx, ry) {

    if (undefined === ry) {
        ry = rx;
    }

    const bound = computePath(circlePath);
    const scaleX = (+rx) * 2 / bound.width;
    const scaleY = (+ry) * 2 / bound.height;
    const centerX = bound.width * scaleX / 2;
    const centerY = bound.height * scaleY / 2;
    const contour = clone(circlePath);
    pathAdjust(contour, scaleX, scaleY);
    pathAdjust(contour, 1, 1, +cx - centerX, +cy - centerY);

    return contour;
}

/**
 * @file 多边形转换成轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 多边形转换成轮廓
 *
 * @param {Array} points 多边形点集合
 * @return {Array} contours
 */
function polygon2contour(points) {

    if (!points || !points.length) {
        return null;
    }

    const contours = [];
    const segments = parseParams(points);
    for (let i = 0, l = segments.length; i < l; i += 2) {
        contours.push({
            x: segments[i],
            y: segments[i + 1],
            onCurve: true
        });
    }

    return contours;
}

/**
 * @file 矩形转换成轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 矩形转换成轮廓
 *
 * @param {number} x 左上角x
 * @param {number} y 左上角y
 * @param {number} width 宽度
 * @param {number} height 高度
 * @return {Array} 轮廓数组
 */
function rect2contour(x, y, width, height) {
    x = +x;
    y = +y;
    width = +width;
    height = +height;

    return [
        {
            x,
            y,
            onCurve: true
        },
        {
            x: x + width,
            y,
            onCurve: true
        },
        {
            x: x + width,
            y: y + height,
            onCurve: true
        },
        {
            x,
            y: y + height,
            onCurve: true
        }
    ];
}

/**
 * @file 解析transform参数
 * @author mengke01(kekee000@gmail.com)
 */
const TRANSFORM_REGEX = /(\w+)\s*\(([\d-.,\s]*)\)/g;

/**
 * 解析transform参数
 *
 * @param {string} str 参数字符串
 * @return {Array} transform数组, 格式如下：
 *     [
 *         {
 *             name: 'scale',
 *             params: []
 *         }
 *     ]
 */
function parseTransform(str) {

    if (!str) {
        return false;
    }

    TRANSFORM_REGEX.lastIndex = 0;
    const transforms = [];
    let match;

    while ((match = TRANSFORM_REGEX.exec(str))) {
        transforms.push({
            name: match[1],
            params: parseParams(match[2])
        });
    }

    return transforms;
}

/**
 * @file matrix变换操作
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 仿射矩阵相乘
 *
 * @param  {Array=} matrix1 矩阵1
 * @param  {Array=} matrix2 矩阵2
 * @return {Array}         新矩阵
 */
function mul(matrix1 = [1, 0, 0, 1], matrix2 = [1, 0, 0, 1]) {
    // 旋转变换 4 个参数
    if (matrix1.length === 4) {
        return [
            matrix1[0] * matrix2[0] + matrix1[2] * matrix2[1],
            matrix1[1] * matrix2[0] + matrix1[3] * matrix2[1],
            matrix1[0] * matrix2[2] + matrix1[2] * matrix2[3],
            matrix1[1] * matrix2[2] + matrix1[3] * matrix2[3]
        ];
    }
    // 旋转位移变换, 6 个参数

    return [
        matrix1[0] * matrix2[0] + matrix1[2] * matrix2[1],
        matrix1[1] * matrix2[0] + matrix1[3] * matrix2[1],
        matrix1[0] * matrix2[2] + matrix1[2] * matrix2[3],
        matrix1[1] * matrix2[2] + matrix1[3] * matrix2[3],

        matrix1[0] * matrix2[4] + matrix1[2] * matrix2[5] + matrix1[4],
        matrix1[1] * matrix2[4] + matrix1[3] * matrix2[5] + matrix1[5]
    ];
}

/**
 * 多个仿射矩阵相乘
 *
 * @param {...Array} matrixs matrix array
 * @return {Array}         新矩阵
 */
function multiply(...matrixs) {
    let result = matrixs[0];
    for (let i = 1, matrix; (matrix = matrixs[i]); i++) {
        result = mul(result, matrix);
    }

    return result;
}

/**
 * @file 根据transform参数变换轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 根据transform参数变换轮廓
 *
 * @param {Array} contours 轮廓集合
 * @param {Array} transforms 变换指令集合
 *     transforms = [{
 *         name: 'scale'
 *         params: [3,4]
 *     }]
 *
 * @return {Array} 变换后的轮廓数组
 */
function contoursTransform(contours, transforms) {
    if (!contours || !contours.length || !transforms || !transforms.length) {
        return contours;
    }

    let matrix = [1, 0, 0, 1, 0, 0];
    for (let i = 0, l = transforms.length; i < l; i++) {
        const transform = transforms[i];
        const params = transform.params;
        let radian = null;
        switch (transform.name) {
        case 'translate':
            matrix = mul(matrix, [1, 0, 0, 1, params[0], params[1]]);
            break;
        case 'scale':
            matrix = mul(matrix, [params[0], 0, 0, params[1], 0, 0]);
            break;
        case 'matrix':
            matrix = mul(matrix,
                [params[0], params[1], params[2], params[3], params[4], params[5]]);
            break;
        case 'rotate':
            radian = params[0] * Math.PI / 180;
            if (params.length > 1) {

                matrix = multiply(
                    matrix,
                    [1, 0, 0, 1, -params[1], -params[2]],
                    [Math.cos(radian), Math.sin(radian), -Math.sin(radian), Math.cos(radian), 0, 0],
                    [1, 0, 0, 1, params[1], params[2]]
                );
            }
            else {
                matrix = mul(
                    matrix, [Math.cos(radian), Math.sin(radian), -Math.sin(radian), Math.cos(radian), 0, 0]);
            }
            break;
        case 'skewX':
            matrix = mul(matrix,
                [1, 0, Math.tan(params[0] * Math.PI / 180), 1, 0, 0]);
            break;
        case 'skewY':
            matrix = mul(matrix,
                [1, Math.tan(params[0] * Math.PI / 180), 0, 1, 0, 0]);
            break;
        }
    }

    contours.forEach(p => {
        transform(p, matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
    });

    return contours;
}

/**
 * @file svg节点转字形轮廓
 * @author mengke01(kekee000@gmail.com)
 */

// 支持的解析器集合
const support = {

    path: {
        parse: path2contours, // 解析器
        params: ['d'], // 参数列表
        contours: true // 是否是多个轮廓
    },

    circle: {
        parse: oval2contour,
        params: ['cx', 'cy', 'r']
    },

    ellipse: {
        parse: oval2contour,
        params: ['cx', 'cy', 'rx', 'ry']
    },

    rect: {
        parse: rect2contour,
        params: ['x', 'y', 'width', 'height']
    },

    polygon: {
        parse: polygon2contour,
        params: ['points']
    },

    polyline: {
        parse: polygon2contour,
        params: ['points']
    }
};

/**
 * svg节点转字形轮廓
 *
 * @param {Array} xmlNodes xml节点集合
 * @return {Array|false} 轮廓数组
 */
function svgnode2contours(xmlNodes) {
    let i;
    let length;
    let j;
    let jlength;
    let segment; // 当前指令
    const parsedSegments = []; // 解析后的指令

    if (xmlNodes.length) {
        for (i = 0, length = xmlNodes.length; i < length; i++) {
            const node = xmlNodes[i];
            const name = node.tagName;
            if (support[name]) {
                const supportParams = support[name].params;
                const params = [];
                for (j = 0, jlength = supportParams.length; j < jlength; j++) {
                    params.push(node.getAttribute(supportParams[j]));
                }

                segment = {
                    name,
                    params,
                    transform: parseTransform(node.getAttribute('transform'))
                };

                if (node.parentNode) {
                    let curNode = node.parentNode;
                    const transforms = segment.transform || [];
                    let transAttr;
                    const iterator = function (t) {
                        transforms.unshift(t);
                    };
                    while (curNode !== null && curNode.tagName !== 'svg') {
                        transAttr = curNode.getAttribute('transform');
                        if (transAttr) {
                            parseTransform(transAttr).reverse().forEach(iterator);
                        }
                        curNode = curNode.parentNode;
                    }

                    segment.transform = transforms.length ? transforms : null;
                }
                parsedSegments.push(segment);
            }
        }
    }

    if (parsedSegments.length) {
        const result = [];
        for (i = 0, length = parsedSegments.length; i < length; i++) {
            segment = parsedSegments[i];
            const parser = support[segment.name];
            const contour = parser.parse.apply(null, segment.params);
            if (contour && contour.length) {
                let contours = parser.contours ? contour : [contour];

                // 如果有变换则应用变换规则
                if (segment.transform) {
                    contours = contoursTransform(contours, segment.transform);
                }

                for (j = 0, jlength = contours.length; j < jlength; j++) {
                    result.push(contours[j]);
                }
            }
        }
        return result;
    }

    return false;
}

/**
 * @file 路径旋转
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 对path坐标进行调整
 *
 * @param {Object} contour 坐标点
 * @param {number} angle 角度
 * @param {number} centerX x偏移
 * @param {number} centerY y偏移
 *
 * @return {Object} contour 坐标点
 */
function pathRotate(contour, angle, centerX, centerY) {
    angle = angle === undefined ? 0 : angle;
    const x = centerX || 0;
    const y = centerY || 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let px;
    let py;
    let p;

    // x1=cos(angle)*x-sin(angle)*y;
    // y1=cos(angle)*y+sin(angle)*x;
    for (let i = 0, l = contour.length; i < l; i++) {
        p = contour[i];
        px = cos * (p.x - x) - sin * (p.y - y);
        py = cos * (p.y - y) + sin * (p.x - x);
        p.x = px + x;
        p.y = py + y;
    }

    return contour;
}

/**
 * @file 路径组变化函数
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 翻转路径
 *
 * @param {Array} paths 路径数组
 * @param {number} xScale x翻转
 * @param {number} yScale y翻转
 * @return {Array} 变换后的路径
 */
function mirrorPaths(paths, xScale, yScale) {
    const {x, y, width, height} = computePath(...paths);

    if (xScale === -1) {
        paths.forEach(p => {
            pathAdjust(p, -1, 1, -x, 0);
            pathAdjust(p, 1, 1, x + width, 0);
            p.reverse();
        });

    }

    if (yScale === -1) {
        paths.forEach(p => {
            pathAdjust(p, 1, -1, 0, -y);
            pathAdjust(p, 1, 1, 0, y + height);
            p.reverse();
        });
    }

    return paths;
}



var pathsUtil = {

    /**
     * 旋转路径
     *
     * @param {Array} paths 路径数组
     * @param {number} angle 弧度
     * @return {Array} 变换后的路径
     */
    rotate(paths, angle) {
        if (!angle) {
            return paths;
        }

        const bound = computePath(...paths);

        const cx = bound.x + (bound.width) / 2;
        const cy = bound.y + (bound.height) / 2;

        paths.forEach(p => {
            pathRotate(p, angle, cx, cy);
        });

        return paths;
    },

    /**
     * 路径组变换
     *
     * @param {Array} paths 路径数组
     * @param {number} x x 方向缩放
     * @param {number} y y 方向缩放
     * @return {Array} 变换后的路径
     */
    move(paths, x, y) {
        const bound = computePath(...paths);
        paths.forEach(path => {
            pathAdjust(path, 1, 1, x - bound.x, y - bound.y);
        });

        return paths;
    },

    mirror(paths) {
        return mirrorPaths(paths, -1, 1);
    },

    flip(paths) {
        return mirrorPaths(paths, 1, -1);
    }
};

/**
 * @file svg格式转ttfObject格式
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 加载xml字符串
 *
 * @param {string} xml xml字符串
 * @return {XMLDocument}
 */
function loadXML(xml) {
    if (DOMParser) {
        try {
            const domParser = new DOMParser();
            const xmlDoc = domParser.parseFromString(xml, 'text/xml');
            return xmlDoc;
        }
        catch (exp) {
            error.raise(10103);
        }
    }
    error.raise(10004);
}

/**
 * 对xml文本进行处理
 *
 * @param  {string} svg svg文本
 * @return {string} 处理后文本
 */
function resolveSVG(svg) {
    // 去除xmlns，防止xmlns导致svg解析错误
    svg = svg.replace(/\s+xmlns(?::[\w-]+)?=("|')[^"']*\1/g, ' ')
        .replace(/<defs[>\s][\s\S]+?\/defs>/g, (text) => {
            if (text.indexOf('</font>') >= 0) {
                return text;
            }
            return '';
        })
        .replace(/<use[>\s][\s\S]+?\/use>/g, '');
    return svg;
}

/**
 * 获取空的ttf格式对象
 *
 * @return {Object} ttfObject对象
 */
function getEmptyTTF() {
    const ttf = getEmpty();
    ttf.head.unitsPerEm = 0; // 去除unitsPerEm以便于重新计算
    ttf.from = 'svgfont';
    return ttf;
}

/**
 * 获取空的对象，用来作为ttf的容器
 *
 * @return {Object} ttfObject对象
 */
function getEmptyObject() {
    return {
        'from': 'svg',
        'OS/2': {},
        'name': {},
        'hhea': {},
        'head': {},
        'post': {},
        'glyf': []
    };
}

/**
 * 根据边界获取unitsPerEm
 *
 * @param {number} xMin x最小值
 * @param {number} xMax x最大值
 * @param {number} yMin y最小值
 * @param {number} yMax y最大值
 * @return {number}
 */
function getUnitsPerEm(xMin, xMax, yMin, yMax) {
    const seed = Math.ceil(Math.min(yMax - yMin, xMax - xMin));

    if (!seed) {
        return 1024;
    }

    if (seed <= 128) {
        return seed;
    }

    // 获取合适的unitsPerEm
    let unitsPerEm = 128;
    while (unitsPerEm < 16384) {

        if (seed <= 1.2 * unitsPerEm) {
            return unitsPerEm;
        }

        unitsPerEm <<= 1;
    }

    return 1024;
}

/**
 * 对ttfObject进行处理，去除小数
 *
 * @param {Object} ttf ttfObject
 * @return {Object} ttfObject
 */
function resolve(ttf) {


    // 如果是svg格式字体，则去小数
    // 由于svg格式导入时候会出现字形重复问题，这里进行优化
    if (ttf.from === 'svgfont' && ttf.head.unitsPerEm > 128) {
        ttf.glyf.forEach((g) => {
            if (g.contours) {
                glyfAdjust(g);
                reduceGlyf(g);
            }
        });
    }
    // 否则重新计算字形大小，缩放到1024的em
    else {
        let xMin = 16384;
        let xMax = -16384;
        let yMin = 16384;
        let yMax = -16384;

        ttf.glyf.forEach((g) => {
            if (g.contours) {
                const bound = computePathBox(...g.contours);
                if (bound) {
                    xMin = Math.min(xMin, bound.x);
                    xMax = Math.max(xMax, bound.x + bound.width);
                    yMin = Math.min(yMin, bound.y);
                    yMax = Math.max(yMax, bound.y + bound.height);
                }
            }
        });

        const unitsPerEm = getUnitsPerEm(xMin, xMax, yMin, yMax);
        const scale = 1024 / unitsPerEm;

        ttf.glyf.forEach((g) => {
            glyfAdjust(g, scale, scale);
            reduceGlyf(g);
        });
        ttf.head.unitsPerEm = 1024;
    }

    return ttf;
}

/**
 * 解析字体信息相关节点
 *
 * @param {XMLDocument} xmlDoc XML文档对象
 * @param {Object} ttf ttf对象
 * @return {Object} ttf对象
 */
function parseFont(xmlDoc, ttf) {

    const metaNode = xmlDoc.getElementsByTagName('metadata')[0];
    const fontNode = xmlDoc.getElementsByTagName('font')[0];
    const fontFaceNode = xmlDoc.getElementsByTagName('font-face')[0];

    if (metaNode && metaNode.textContent) {
        ttf.metadata = string.decodeHTML(metaNode.textContent.trim());
    }

    // 解析font，如果有font节点说明是svg格式字体文件
    if (fontNode) {
        ttf.id = fontNode.getAttribute('id') || '';
        ttf.hhea.advanceWidthMax = +(fontNode.getAttribute('horiz-adv-x') || 0);
        ttf.from = 'svgfont';
    }

    if (fontFaceNode) {
        const OS2 = ttf['OS/2'];
        ttf.name.fontFamily = fontFaceNode.getAttribute('font-family') || '';
        OS2.usWeightClass = +(fontFaceNode.getAttribute('font-weight') || 0);
        ttf.head.unitsPerEm = +(fontFaceNode.getAttribute('units-per-em') || 0);

        // 解析panose, eg: 2 0 6 3 0 0 0 0 0 0
        const panose = (fontFaceNode.getAttribute('panose-1') || '').split(' ');
        [
            'bFamilyType', 'bSerifStyle', 'bWeight', 'bProportion', 'bContrast',
            'bStrokeVariation', 'bArmStyle', 'bLetterform', 'bMidline', 'bXHeight'
        ].forEach((name, i) => {
            OS2[name] = +(panose[i] || 0);
        });

        ttf.hhea.ascent = +(fontFaceNode.getAttribute('ascent') || 0);
        ttf.hhea.descent = +(fontFaceNode.getAttribute('descent') || 0);
        OS2.bXHeight = +(fontFaceNode.getAttribute('x-height') || 0);

        // 解析bounding
        const box = (fontFaceNode.getAttribute('bbox') || '').split(' ');
        ['xMin', 'yMin', 'xMax', 'yMax'].forEach((name, i) => {
            ttf.head[name] = +(box[i] || '');
        });

        ttf.post.underlineThickness = +(fontFaceNode.getAttribute('underline-thickness') || 0);
        ttf.post.underlinePosition = +(fontFaceNode.getAttribute('underline-position') || 0);

        // unicode range
        const unicodeRange = fontFaceNode.getAttribute('unicode-range');
        if (unicodeRange) {
            unicodeRange.replace(/u\+([0-9A-Z]+)(-[0-9A-Z]+)?/i, ($0, a, b) => {
                OS2.usFirstCharIndex = Number('0x' + a);
                OS2.usLastCharIndex = b ? Number('0x' + b.slice(1)) : 0xFFFFFFFF;
            });
        }
    }

    return ttf;
}

/**
 * 解析字体信息相关节点
 *
 * @param {XMLDocument} xmlDoc XML文档对象
 * @param {Object} ttf ttf对象
 * @return {Object} ttf对象
 */
function parseGlyf$1(xmlDoc, ttf) {

    const missingNode = xmlDoc.getElementsByTagName('missing-glyph')[0];

    // 解析glyf
    let d;
    let unicode;
    if (missingNode) {

        const missing = {
            name: '.notdef'
        };

        if (missingNode.getAttribute('horiz-adv-x')) {
            missing.advanceWidth = +missingNode.getAttribute('horiz-adv-x');
        }

        if ((d = missingNode.getAttribute('d'))) {
            missing.contours = path2contours(d);
        }

        // 去除默认的空字形
        if (ttf.glyf[0] && ttf.glyf[0].name === '.notdef') {
            ttf.glyf.splice(0, 1);
        }

        ttf.glyf.unshift(missing);
    }

    const glyfNodes = xmlDoc.getElementsByTagName('glyph');

    if (glyfNodes.length) {


        for (let i = 0, l = glyfNodes.length; i < l; i++) {

            const node = glyfNodes[i];
            const glyf = {
                name: node.getAttribute('glyph-name') || node.getAttribute('name') || ''
            };

            if (node.getAttribute('horiz-adv-x')) {
                glyf.advanceWidth = +node.getAttribute('horiz-adv-x');
            }

            if ((unicode = node.getAttribute('unicode'))) {
                const nextUnicode = [];
                let totalCodePoints = 0;
                for (let ui = 0; ui < unicode.length; ui++) {
                    const ucp = unicode.codePointAt(ui);
                    nextUnicode.push(ucp);
                    ui = ucp > 0xffff ? ui + 1 : ui;
                    totalCodePoints += 1;
                }
                if (totalCodePoints === 1) {
                    // TTF can't handle ligatures
                    glyf.unicode = nextUnicode;

                    if ((d = node.getAttribute('d'))) {
                        glyf.contours = path2contours(d);
                    }
                    ttf.glyf.push(glyf);

                }
            }

        }
    }

    return ttf;
}


/**
 * 解析字体信息相关节点
 *
 * @param {XMLDocument} xmlDoc XML文档对象
 * @param {Object} ttf ttf对象
 */
function parsePath(xmlDoc, ttf) {

    // 单个path组成一个glfy字形
    let contours;
    let glyf;
    let node;
    const pathNodes = xmlDoc.getElementsByTagName('path');

    if (pathNodes.length) {
        for (let i = 0, l = pathNodes.length; i < l; i++) {
            node = pathNodes[i];
            glyf = {
                name: node.getAttribute('name') || ''
            };
            contours = svgnode2contours([node]);
            glyf.contours = contours;
            ttf.glyf.push(glyf);
        }
    }

    // 其他svg指令组成一个glyf字形
    contours = svgnode2contours(
        Array.prototype.slice.call(xmlDoc.getElementsByTagName('*')).filter((node) => node.tagName !== 'path')
    );
    if (contours) {
        glyf = {
            name: ''
        };

        glyf.contours = contours;
        ttf.glyf.push(glyf);
    }
}

/**
 * 解析xml文档
 *
 * @param {XMLDocument} xmlDoc XML文档对象
 * @param {Object} options 导入选项
 *
 * @return {Object} 解析后对象
 */
function parseXML(xmlDoc, options) {

    if (!xmlDoc.getElementsByTagName('svg').length) {
        error.raise(10106);
    }

    let ttf;

    // 如果是svg字体格式，则解析glyf，否则解析path
    if (xmlDoc.getElementsByTagName('font')[0]) {
        ttf = getEmptyTTF();
        parseFont(xmlDoc, ttf);
        parseGlyf$1(xmlDoc, ttf);
    }
    else {
        ttf = getEmptyObject();
        parsePath(xmlDoc, ttf);
    }

    if (!ttf.glyf.length) {
        error.raise(10201);
    }

    if (ttf.from === 'svg') {
        const glyf = ttf.glyf;
        let i;
        let l;
        // 合并导入的字形为单个字形
        if (options.combinePath) {
            const combined = [];
            for (i = 0, l = glyf.length; i < l; i++) {
                const contours = glyf[i].contours;
                for (let index = 0, length = contours.length; index < length; index++) {
                    combined.push(contours[index]);
                }
            }

            glyf[0].contours = combined;
            glyf.splice(1);
        }

        // 对字形进行反转
        for (i = 0, l = glyf.length; i < l; i++) {
            // 这里为了使ai等工具里面的字形方便导入，对svg做了反向处理
            glyf[i].contours = pathsUtil.flip(glyf[i].contours);
        }
    }

    return ttf;
}

/**
 * svg格式转ttfObject格式
 *
 * @param {string} svg svg格式
 * @param {Object=} options 导入选项
 * @param {boolean} options.combinePath 是否合并成单个字形，仅限于普通svg导入
 * @return {Object} ttfObject
 */
function svg2ttfObject(svg, options = {combinePath: false}) {
    let xmlDoc = svg;
    if (typeof svg === 'string') {
        svg = resolveSVG(svg);
        xmlDoc = loadXML(svg);
    }

    const ttf = parseXML(xmlDoc, options);
    return resolve(ttf);
}

/**
 * @file loca表
 * @author mengke01(kekee000@gmail.com)
 */

var loca = table.create(
    'loca',
    [],
    {

        read(reader, ttf) {
            let offset = this.offset;
            const indexToLocFormat = ttf.head.indexToLocFormat;
            // indexToLocFormat有2字节和4字节的区别
            const type = struct.names[(indexToLocFormat === 0) ? struct.Uint16 : struct.Uint32];
            const size = (indexToLocFormat === 0) ? 2 : 4; // 字节大小
            const sizeRatio = (indexToLocFormat === 0) ? 2 : 1; // 真实地址偏移
            const wordOffset = [];

            reader.seek(offset);

            const numGlyphs = ttf.maxp.numGlyphs;
            for (let i = 0; i < numGlyphs; ++i) {
                wordOffset.push(reader.read(type, offset, false) * sizeRatio);
                offset += size;
            }

            return wordOffset;
        },

        write(writer, ttf) {
            const glyfSupport = ttf.support.glyf;
            let offset = ttf.support.glyf.offset || 0;
            const indexToLocFormat = ttf.head.indexToLocFormat;
            const sizeRatio = (indexToLocFormat === 0) ? 0.5 : 1;
            const numGlyphs = ttf.glyf.length;

            for (let i = 0; i < numGlyphs; ++i) {
                if (indexToLocFormat) {
                    writer.writeUint32(offset);
                }
                else {
                    writer.writeUint16(offset);
                }
                offset += glyfSupport[i].size * sizeRatio;
            }

            // write extra
            if (indexToLocFormat) {
                writer.writeUint32(offset);
            }
            else {
                writer.writeUint16(offset);
            }

            return writer;
        },

        size(ttf) {
            const locaCount = ttf.glyf.length + 1;
            return ttf.head.indexToLocFormat ? locaCount * 4 : locaCount * 2;
        }
    }
);

/**
 * @file 轮廓标记位
 * @author mengke01(kekee000@gmail.com)
 *
 * see:
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6glyf.html
 */

var glyFlag = {
    ONCURVE: 0x01, // on curve ,off curve
    XSHORT: 0x02, // x-Short Vector
    YSHORT: 0x04, // y-Short Vector
    REPEAT: 0x08, // next byte is flag repeat count
    XSAME: 0x10, // This x is same (Positive x-Short vector)
    YSAME: 0x20, // This y is same (Positive y-Short vector)
    Reserved1: 0x40,
    Reserved2: 0x80
};

/**
 * @file 复合图元标记位
 * @author mengke01(kekee000@gmail.com)
 *
 * 复合图元标记位
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6glyf.html
 */

var componentFlag = {
    ARG_1_AND_2_ARE_WORDS: 0x01,
    ARGS_ARE_XY_VALUES: 0x02,
    ROUND_XY_TO_GRID: 0x04,
    WE_HAVE_A_SCALE: 0x08,
    RESERVED: 0x10,
    MORE_COMPONENTS: 0x20,
    WE_HAVE_AN_X_AND_Y_SCALE: 0x40,
    WE_HAVE_A_TWO_BY_TWO: 0x80,
    WE_HAVE_INSTRUCTIONS: 0x100,
    USE_MY_METRICS: 0x200,
    OVERLAP_COMPOUND: 0x400,
    SCALED_COMPONENT_OFFSET: 0x800,
    UNSCALED_COMPONENT_OFFSET: 0x1000
};

/**
 * @file 解析glyf轮廓
 * @author mengke01(kekee000@gmail.com)
 */

const MAX_INSTRUCTION_LENGTH = 5000; // 设置instructions阈值防止读取错误
const MAX_NUMBER_OF_COORDINATES = 20000; // 设置坐标最大个数阈值，防止glyf读取错误

/**
 * 读取简单字形
 *
 * @param {Reader} reader Reader对象
 * @param {Object} glyf 空glyf
 * @return {Object} 解析后的glyf
 */
function parseSimpleGlyf(reader, glyf) {
    const offset = reader.offset;

    // 轮廓点个数
    const numberOfCoordinates = glyf.endPtsOfContours[
        glyf.endPtsOfContours.length - 1
    ] + 1;

    // 判断坐标是否超过最大个数
    if (numberOfCoordinates > MAX_NUMBER_OF_COORDINATES) {
        console.warn('error read glyf coordinates:' + offset);
        return glyf;
    }

    // 获取flag标志
    let i;
    let length;
    const flags = [];
    let flag;

    i = 0;
    while (i < numberOfCoordinates) {
        flag = reader.readUint8();
        flags.push(flag);
        i++;

        // 标志位3重复flag
        if ((flag & glyFlag.REPEAT) && i < numberOfCoordinates) {
            // 重复个数
            const repeat = reader.readUint8();
            for (let j = 0; j < repeat; j++) {
                flags.push(flag);
                i++;
            }
        }
    }

    // 坐标集合
    const coordinates = [];
    const xCoordinates = [];
    let prevX = 0;
    let x;

    for (i = 0, length = flags.length; i < length; ++i) {
        x = 0;
        flag = flags[i];

        // 标志位1
        // If set, the corresponding y-coordinate is 1 byte long, not 2
        if (flag & glyFlag.XSHORT) {
            x = reader.readUint8();

            // 标志位5
            x = (flag & glyFlag.XSAME) ? x : -1 * x;
        }
        // 与上一值一致
        else if (flag & glyFlag.XSAME) {
            x = 0;
        }
        // 新值
        else {
            x = reader.readInt16();
        }

        prevX += x;
        xCoordinates[i] = prevX;
        coordinates[i] = {
            x: prevX,
            y: 0
        };
        if (flag & glyFlag.ONCURVE) {
            coordinates[i].onCurve = true;
        }
    }

    const yCoordinates = [];
    let prevY = 0;
    let y;

    for (i = 0, length = flags.length; i < length; i++) {
        y = 0;
        flag = flags[i];

        if (flag & glyFlag.YSHORT) {
            y = reader.readUint8();
            y = (flag & glyFlag.YSAME) ? y : -1 * y;
        }
        else if (flag & glyFlag.YSAME) {
            y = 0;
        }
        else {
            y = reader.readInt16();
        }

        prevY += y;
        yCoordinates[i] = prevY;
        if (coordinates[i]) {
            coordinates[i].y = prevY;
        }
    }

    // 计算轮廓集合
    if (coordinates.length) {
        const endPtsOfContours = glyf.endPtsOfContours;
        const contours = [];
        contours.push(coordinates.slice(0, endPtsOfContours[0] + 1));

        for (i = 1, length = endPtsOfContours.length; i < length; i++) {
            contours.push(coordinates.slice(endPtsOfContours[i - 1] + 1, endPtsOfContours[i] + 1));
        }

        glyf.contours = contours;
    }

    return glyf;
}

/**
 * 读取复合字形
 *
 * @param {Reader} reader Reader对象
 * @param {Object} glyf glyf对象
 * @return {Object} glyf对象
 */
function parseCompoundGlyf(reader, glyf) {
    glyf.compound = true;
    glyf.glyfs = [];

    let flags;
    let g;

    // 读取复杂字形
    do {
        flags = reader.readUint16();
        g = {};
        g.flags = flags;
        g.glyphIndex = reader.readUint16();

        let arg1 = 0;
        let arg2 = 0;
        let scaleX = 16384;
        let scaleY = 16384;
        let scale01 = 0;
        let scale10 = 0;

        if (componentFlag.ARG_1_AND_2_ARE_WORDS & flags) {
            arg1 = reader.readInt16();
            arg2 = reader.readInt16();

        }
        else {
            arg1 = reader.readInt8();
            arg2 = reader.readInt8();
        }

        if (componentFlag.ROUND_XY_TO_GRID & flags) {
            arg1 = Math.round(arg1);
            arg2 = Math.round(arg2);
        }

        if (componentFlag.WE_HAVE_A_SCALE & flags) {
            scaleX = reader.readInt16();
            scaleY = scaleX;
        }
        else if (componentFlag.WE_HAVE_AN_X_AND_Y_SCALE & flags) {
            scaleX = reader.readInt16();
            scaleY = reader.readInt16();
        }
        else if (componentFlag.WE_HAVE_A_TWO_BY_TWO & flags) {
            scaleX = reader.readInt16();
            scale01 = reader.readInt16();
            scale10 = reader.readInt16();
            scaleY = reader.readInt16();
        }

        if (componentFlag.ARGS_ARE_XY_VALUES & flags) {
            g.useMyMetrics = !!flags & componentFlag.USE_MY_METRICS;
            g.overlapCompound = !!flags & componentFlag.OVERLAP_COMPOUND;

            g.transform = {
                a: Math.round(10000 * scaleX / 16384) / 10000,
                b: Math.round(10000 * scale01 / 16384) / 10000,
                c: Math.round(10000 * scale10 / 16384) / 10000,
                d: Math.round(10000 * scaleY / 16384) / 10000,
                e: arg1,
                f: arg2
            };
        }
        else {
            g.points = [arg1, arg2];
            g.transform = {
                a: Math.round(10000 * scaleX / 16384) / 10000,
                b: Math.round(10000 * scale01 / 16384) / 10000,
                c: Math.round(10000 * scale10 / 16384) / 10000,
                d: Math.round(10000 * scaleY / 16384) / 10000,
                e: 0,
                f: 0
            };
        }

        glyf.glyfs.push(g);

    } while (componentFlag.MORE_COMPONENTS & flags);

    if (componentFlag.WE_HAVE_INSTRUCTIONS & flags) {
        const length = reader.readUint16();
        if (length < MAX_INSTRUCTION_LENGTH) {
            const instructions = [];
            for (let i = 0; i < length; ++i) {
                instructions.push(reader.readUint8());
            }
            glyf.instructions = instructions;
        }
        else {
            console.warn(length);
        }
    }

    return glyf;
}



/**
 * 解析glyf轮廓
 *
 * @param  {Reader} reader 读取器
 * @param  {Object} ttf    ttf对象
 * @param  {number=} offset 偏移
 * @return {Object}        glyf对象
 */
function parseGlyf(reader, ttf, offset) {

    if (null != offset) {
        reader.seek(offset);
    }

    const glyf = {};
    let i;
    let length;
    let instructions;

    // 边界值
    const numberOfContours = reader.readInt16();
    glyf.xMin = reader.readInt16();
    glyf.yMin = reader.readInt16();
    glyf.xMax = reader.readInt16();
    glyf.yMax = reader.readInt16();

    // 读取简单字形
    if (numberOfContours >= 0) {
        // endPtsOfConturs
        const endPtsOfContours = [];
        if (numberOfContours >= 0) {
            for (i = 0; i < numberOfContours; i++) {
                endPtsOfContours.push(reader.readUint16());
            }
            glyf.endPtsOfContours = endPtsOfContours;
        }

        // instructions
        length = reader.readUint16();
        if (length) {
            // range错误
            if (length < MAX_INSTRUCTION_LENGTH) {
                instructions = [];
                for (i = 0; i < length; ++i) {
                    instructions.push(reader.readUint8());
                }
                glyf.instructions = instructions;
            }
            else {
                console.warn(length);
            }
        }

        parseSimpleGlyf(reader, glyf);
        delete glyf.endPtsOfContours;
    }
    else {
        parseCompoundGlyf(reader, glyf);
    }

    return glyf;
}

/**
 * @file 写glyf数据
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 写glyf
 *
 * @param  {Object} writer 写入器
 * @param  {Object} ttf    ttf对象
 * @return {Object}        写入器
 */
function write(writer, ttf) {

    const hinting = ttf.writeOptions ? ttf.writeOptions.hinting : false;
    ttf.glyf.forEach((glyf, index) => {

        // header
        writer.writeInt16(glyf.compound ? -1 : (glyf.contours || []).length);
        writer.writeInt16(glyf.xMin);
        writer.writeInt16(glyf.yMin);
        writer.writeInt16(glyf.xMax);
        writer.writeInt16(glyf.yMax);

        let i;
        let l;
        let flags;

        // 复合图元
        if (glyf.compound) {

            for (i = 0, l = glyf.glyfs.length; i < l; i++) {
                const g = glyf.glyfs[i];

                flags = g.points
                    ? 0 : (componentFlag.ARGS_ARE_XY_VALUES + componentFlag.ROUND_XY_TO_GRID); // xy values

                // more components
                if (i < l - 1) {
                    flags += componentFlag.MORE_COMPONENTS;
                }


                // use my metrics
                flags += g.useMyMetrics ? componentFlag.USE_MY_METRICS : 0;
                // overlap compound
                flags += g.overlapCompound ? componentFlag.OVERLAP_COMPOUND : 0;

                const transform = g.transform;
                const a = transform.a;
                const b = transform.b;
                const c = transform.c;
                const d = transform.d;
                const e = g.points ? g.points[0] : transform.e;
                const f = g.points ? g.points[1] : transform.f;

                // xy values or points
                // int 8 放不下，则用int16放
                if (e < 0 || e > 0x7F || f < 0 || f > 0x7F) {
                    flags += componentFlag.ARG_1_AND_2_ARE_WORDS;
                }

                if (b || c) {
                    flags += componentFlag.WE_HAVE_A_TWO_BY_TWO;
                }
                else if ((a !== 1 || d !== 1) && a === d) {
                    flags += componentFlag.WE_HAVE_A_SCALE;
                }
                else if (a !== 1 || d !== 1) {
                    flags += componentFlag.WE_HAVE_AN_X_AND_Y_SCALE;
                }

                writer.writeUint16(flags);
                writer.writeUint16(g.glyphIndex);

                if (componentFlag.ARG_1_AND_2_ARE_WORDS & flags) {
                    writer.writeInt16(e);
                    writer.writeInt16(f);

                }
                else {
                    writer.writeUint8(e);
                    writer.writeUint8(f);
                }

                if (componentFlag.WE_HAVE_A_SCALE & flags) {
                    writer.writeInt16(Math.round(a * 16384));
                }
                else if (componentFlag.WE_HAVE_AN_X_AND_Y_SCALE & flags) {
                    writer.writeInt16(Math.round(a * 16384));
                    writer.writeInt16(Math.round(d * 16384));
                }
                else if (componentFlag.WE_HAVE_A_TWO_BY_TWO & flags) {
                    writer.writeInt16(Math.round(a * 16384));
                    writer.writeInt16(Math.round(b * 16384));
                    writer.writeInt16(Math.round(c * 16384));
                    writer.writeInt16(Math.round(d * 16384));
                }
            }

        }
        else {

            let endPtsOfContours = -1;
            (glyf.contours || []).forEach((contour) => {
                endPtsOfContours += contour.length;
                writer.writeUint16(endPtsOfContours);
            });

            // instruction
            if (hinting && glyf.instructions) {
                const instructions = glyf.instructions;
                writer.writeUint16(instructions.length);
                for (i = 0, l = instructions.length; i < l; i++) {
                    writer.writeUint8(instructions[i]);
                }
            }
            else {
                writer.writeUint16(0);
            }


            // 获取暂存中的flags
            flags = ttf.support.glyf[index].flags || [];
            for (i = 0, l = flags.length; i < l; i++) {
                writer.writeUint8(flags[i]);
            }

            const xCoord = ttf.support.glyf[index].xCoord || [];
            for (i = 0, l = xCoord.length; i < l; i++) {
                if (0 <= xCoord[i] && xCoord[i] <= 0xFF) {
                    writer.writeUint8(xCoord[i]);
                }
                else {
                    writer.writeInt16(xCoord[i]);
                }
            }

            const yCoord = ttf.support.glyf[index].yCoord || [];
            for (i = 0, l = yCoord.length; i < l; i++) {
                if (0 <= yCoord[i] && yCoord[i] <= 0xFF) {
                    writer.writeUint8(yCoord[i]);
                }
                else {
                    writer.writeInt16(yCoord[i]);
                }
            }
        }

        // 4字节对齐
        const glyfSize = ttf.support.glyf[index].glyfSize;

        if (glyfSize % 4) {
            writer.writeEmpty(4 - glyfSize % 4);
        }
    });

    return writer;
}

/**
 * @file 获取glyf的大小，同时对glyf写入进行预处理
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 获取glyf的大小
 *
 * @param {Object} glyf glyf对象
 * @param {Object} glyfSupport glyf相关统计
 * @param {boolean} hinting 是否保留hints
 * @return {number} size大小
 */
function sizeofSimple(glyf, glyfSupport, hinting) {

    // fixed header + endPtsOfContours
    let result = 12
        + (glyf.contours || []).length * 2
        + (glyfSupport.flags || []).length;

    (glyfSupport.xCoord || []).forEach((x) => {
        result += 0 <= x && x <= 0xFF ? 1 : 2;
    });

    (glyfSupport.yCoord || []).forEach((y) => {
        result += 0 <= y && y <= 0xFF ? 1 : 2;
    });

    return result + (hinting && glyf.instructions ? glyf.instructions.length : 0);
}

/**
 * 复合图元size
 *
 * @param {Object} glyf glyf对象
 * @param {boolean} hinting 是否保留hints, compound 图元暂时不做hinting
 * @return {number} size大小
 */
// eslint-disable-next-line no-unused-vars
function sizeofCompound(glyf, hinting) {
    let size = 10;
    let transform;
    glyf.glyfs.forEach((g) => {
        transform = g.transform;
        // flags + glyfIndex
        size += 4;

        // a, b, c, d, e
        // xy values or points
        if (transform.e < 0 || transform.e > 0x7F || transform.f < 0 || transform.f > 0x7F) {
            size += 4;
        }
        else {
            size += 2;
        }

        // 01 , 10
        if (transform.b || transform.c) {
            size += 8;
        }
        // scale
        else if (transform.a !== 1 || transform.d !== 1) {
            size += transform.a === transform.d ? 2 : 4;
        }

    });

    return size;
}

/**
 * 获取flags
 *
 * @param {Object} glyf glyf对象
 * @param {Object} glyfSupport glyf相关统计
 * @return {Array}
 */
function getFlags(glyf, glyfSupport) {

    if (!glyf.contours || 0 === glyf.contours.length) {
        return glyfSupport;
    }

    const flags = [];
    const xCoord = [];
    const yCoord = [];

    const contours = glyf.contours;
    let contour;
    let prev;
    let first = true;

    for (let j = 0, cl = contours.length; j < cl; j++) {
        contour = contours[j];

        for (let i = 0, l = contour.length; i < l; i++) {

            const point = contour[i];
            if (first) {
                xCoord.push(point.x);
                yCoord.push(point.y);
                first = false;
            }
            else {
                xCoord.push(point.x - prev.x);
                yCoord.push(point.y - prev.y);
            }
            flags.push(point.onCurve ? glyFlag.ONCURVE : 0);
            prev = point;
        }
    }

    // compress
    const flagsC = [];
    const xCoordC = [];
    const yCoordC = [];
    let x;
    let y;
    let prevFlag;
    let repeatPoint = -1;

    flags.forEach((flag, index) => {

        x = xCoord[index];
        y = yCoord[index];

        // 第一个
        if (index === 0) {

            if (-0xFF <= x && x <= 0xFF) {
                flag += glyFlag.XSHORT;
                if (x >= 0) {
                    flag += glyFlag.XSAME;
                }

                x = Math.abs(x);
            }

            if (-0xFF <= y && y <= 0xFF) {
                flag += glyFlag.YSHORT;
                if (y >= 0) {
                    flag += glyFlag.YSAME;
                }

                y = Math.abs(y);
            }

            flagsC.push(prevFlag = flag);
            xCoordC.push(x);
            yCoordC.push(y);
        }
        // 后续
        else {

            if (x === 0) {
                flag += glyFlag.XSAME;
            }
            else {
                if (-0xFF <= x && x <= 0xFF) {
                    flag += glyFlag.XSHORT;
                    if (x > 0) {
                        flag += glyFlag.XSAME;
                    }

                    x = Math.abs(x);
                }

                xCoordC.push(x);
            }

            if (y === 0) {
                flag += glyFlag.YSAME;
            }
            else {
                if (-0xFF <= y && y <= 0xFF) {
                    flag += glyFlag.YSHORT;
                    if (y > 0) {
                        flag += glyFlag.YSAME;
                    }
                    y = Math.abs(y);
                }
                yCoordC.push(y);
            }

            // repeat
            if (flag === prevFlag) {
                // 记录重复个数
                if (-1 === repeatPoint) {
                    repeatPoint = flagsC.length - 1;
                    flagsC[repeatPoint] |= glyFlag.REPEAT;
                    flagsC.push(1);
                }
                else {
                    ++flagsC[repeatPoint + 1];
                }
            }
            else {
                repeatPoint = -1;
                flagsC.push(prevFlag = flag);
            }
        }

    });

    glyfSupport.flags = flagsC;
    glyfSupport.xCoord = xCoordC;
    glyfSupport.yCoord = yCoordC;

    return glyfSupport;
}

/**
 * 对glyf数据进行预处理，获取大小
 *
 * @param  {Object} ttf ttf对象
 * @return {number} 大小
 */
function sizeof(ttf) {
    ttf.support.glyf = [];
    let tableSize = 0;
    const hinting = ttf.writeOptions ? ttf.writeOptions.hinting : false;
    ttf.glyf.forEach((glyf) => {
        let glyfSupport = {};
        glyfSupport = glyf.compound ? glyfSupport : getFlags(glyf, glyfSupport);

        const glyfSize = glyf.compound
            ? sizeofCompound(glyf)
            : sizeofSimple(glyf, glyfSupport, hinting);
        let size = glyfSize;

        // 4字节对齐
        if (size % 4) {
            size += 4 - size % 4;
        }

        glyfSupport.glyfSize = glyfSize;
        glyfSupport.size = size;

        ttf.support.glyf.push(glyfSupport);

        tableSize += size;
    });

    ttf.support.glyf.tableSize = tableSize;

    // 写header的indexToLocFormat
    ttf.head.indexToLocFormat = tableSize > 65536 ? 1 : 0;

    return ttf.support.glyf.tableSize;
}

/**
 * @file glyf表
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6glyf.html
 */

var glyf = table.create(
    'glyf',
    [],
    {

        read(reader, ttf) {
            const startOffset = this.offset;
            const loca = ttf.loca;
            const numGlyphs = ttf.maxp.numGlyphs;
            const glyphs = [];

            reader.seek(startOffset);

            // subset
            const subset = ttf.readOptions.subset;

            if (subset && subset.length > 0) {
                const subsetMap = {
                    0: true // 设置.notdef
                };
                subsetMap[0] = true;
                // subset map
                const cmap = ttf.cmap;

                // unicode to index
                Object.keys(cmap).forEach((c) => {
                    if (subset.indexOf(+c) > -1) {
                        const i = cmap[c];
                        subsetMap[i] = true;
                    }
                });
                ttf.subsetMap = subsetMap;
                const parsedGlyfMap = {};
                // 循环解析subset相关的glyf，包括复合字形相关的字形
                const travelsParse = function travels(subsetMap) {
                    const newSubsetMap = {};
                    Object.keys(subsetMap).forEach((i) => {
                        const index = +i;
                        parsedGlyfMap[index] = true;
                        // 当前的和下一个一样，或者最后一个无轮廓
                        if (loca[index] === loca[index + 1]) {
                            glyphs[index] = {
                                contours: []
                            };
                        }
                        else {
                            glyphs[index] = parseGlyf(reader, ttf, startOffset + loca[index]);
                        }

                        if (glyphs[index].compound) {
                            glyphs[index].glyfs.forEach((g) => {
                                if (!parsedGlyfMap[g.glyphIndex]) {
                                    newSubsetMap[g.glyphIndex] = true;
                                }
                            });
                        }
                    });

                    if (!isEmptyObject(newSubsetMap)) {
                        travels(newSubsetMap);
                    }
                };

                travelsParse(subsetMap);
                return glyphs;
            }

            // 解析字体轮廓, 前n-1个
            let i;
            let l;
            for (i = 0, l = numGlyphs - 1; i < l; i++) {
                // 当前的和下一个一样，或者最后一个无轮廓
                if (loca[i] === loca[i + 1]) {
                    glyphs[i] = {
                        contours: []
                    };
                }
                else {
                    glyphs[i] = parseGlyf(reader, ttf, startOffset + loca[i]);
                }
            }

            // 最后一个轮廓
            if ((ttf.tables.glyf.length - loca[i]) < 5) {
                glyphs[i] = {
                    contours: []
                };
            }
            else {
                glyphs[i] = parseGlyf(reader, ttf, startOffset + loca[i]);
            }

            return glyphs;
        },

        write,
        size: sizeof
    }
);

/**
 * @file fpgm 表
 * @author mengke01(kekee000@gmail.com)
 *
 * reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6fpgm.html
 */

var fpgm = table.create(
    'fpgm',
    [],
    {

        read(reader, ttf) {
            const length = ttf.tables.fpgm.length;
            return reader.readBytes(this.offset, length);
        },

        write(writer, ttf) {
            if (ttf.fpgm) {
                writer.writeBytes(ttf.fpgm, ttf.fpgm.length);
            }
        },

        size(ttf) {
            return ttf.fpgm ? ttf.fpgm.length : 0;
        }
    }
);

/**
 * @file cvt表
 * @author mengke01(kekee000@gmail.com)
 *
 * @reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cvt.html
 */

var cvt = table.create(
    'cvt',
    [],
    {

        read(reader, ttf) {
            const length = ttf.tables.cvt.length;
            return reader.readBytes(this.offset, length);
        },

        write(writer, ttf) {
            if (ttf.cvt) {
                writer.writeBytes(ttf.cvt, ttf.cvt.length);
            }
        },

        size(ttf) {
            return ttf.cvt ? ttf.cvt.length : 0;
        }
    }
);

/**
 * @file prep表
 * @author mengke01(kekee000@gmail.com)
 *
 * @reference: http://www.microsoft.com/typography/otspec140/prep.htm
 */

var prep = table.create(
    'prep',
    [],
    {

        read(reader, ttf) {
            const length = ttf.tables.prep.length;
            return reader.readBytes(this.offset, length);
        },

        write(writer, ttf) {
            if (ttf.prep) {
                writer.writeBytes(ttf.prep, ttf.prep.length);
            }
        },

        size(ttf) {
            return ttf.prep ? ttf.prep.length : 0;
        }
    }
);

/**
 * @file gasp 表
 * 对于需要hinting的字号需要这个表，否则会导致错误
 * @author mengke01(kekee000@gmail.com)
 * reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6gasp.html
 */

var gasp = table.create(
    'gasp',
    [],
    {

        read(reader, ttf) {
            const length = ttf.tables.gasp.length;
            return reader.readBytes(this.offset, length);
        },

        write(writer, ttf) {
            if (ttf.gasp) {
                writer.writeBytes(ttf.gasp, ttf.gasp.length);
            }
        },

        size(ttf) {
            return ttf.gasp ? ttf.gasp.length : 0;
        }
    }
);

/**
 * @file ttf读取和写入支持的表
 * @author mengke01(kekee000@gmail.com)
 */


var supportTables = {
    head,
    maxp,
    loca,
    cmap,
    glyf,
    name: NameTbl,
    hhea,
    hmtx,
    post,
    'OS/2': OS2,
    fpgm,
    cvt,
    prep,
    gasp,
    GPOS,
    kern
};

/**
 * @file ttf读取器
 * @author mengke01(kekee000@gmail.com)
 *
 * thanks to：
 * ynakajima/ttf.js
 * https://github.com/ynakajima/ttf.js
 */

class TTFReader {

    /**
     * ttf读取器的构造函数
     *
     * @param {Object} options 写入参数
     * @param {boolean} options.hinting 保留hinting信息
     * @param {boolean} options.compound2simple 复合字形转简单字形
     * @constructor
     */
    constructor(options = {}) {
        options.subset = options.subset || []; // 子集
        options.hinting = options.hinting || false; // 不保留hints信息
        options.compound2simple = options.compound2simple || false; // 复合字形转简单字形
        this.options = options;
    }

    /**
     * 初始化读取
     *
     * @param {ArrayBuffer} buffer buffer对象
     * @return {Object} ttf对象
     */
    readBuffer(buffer) {

        const reader = new Reader(buffer, 0, buffer.byteLength, false);

        const ttf = {};

        // version
        ttf.version = reader.readFixed(0);

        if (ttf.version !== 0x1) {
            error.raise(10101);
        }

        // num tables
        ttf.numTables = reader.readUint16();

        if (ttf.numTables <= 0 || ttf.numTables > 100) {
            error.raise(10101);
        }

        // searchRange
        ttf.searchRange = reader.readUint16();

        // entrySelector
        ttf.entrySelector = reader.readUint16();

        // rangeShift
        ttf.rangeShift = reader.readUint16();

        ttf.tables = new Directory(reader.offset).read(reader, ttf);

        if (!ttf.tables.glyf || !ttf.tables.head || !ttf.tables.cmap || !ttf.tables.hmtx) {
            error.raise(10204);
        }

        ttf.readOptions = this.options;

        // 读取支持的表数据
        Object.keys(supportTables).forEach((tableName) => {

            if (ttf.tables[tableName]) {
                const offset = ttf.tables[tableName].offset;
                ttf[tableName] = new supportTables[tableName](offset).read(reader, ttf);
            }
        });

        if (!ttf.glyf) {
            error.raise(10201);
        }

        reader.dispose();

        return ttf;
    }

    /**
     * 关联glyf相关的信息
     *
     * @param {Object} ttf ttf对象
     */
    resolveGlyf(ttf) {
        const codes = ttf.cmap;
        const glyf = ttf.glyf;
        const subsetMap = ttf.readOptions.subset ? ttf.subsetMap : null; // 当前ttf的子集列表

        // unicode
        Object.keys(codes).forEach((c) => {
            const i = codes[c];
            if (subsetMap && !subsetMap[i]) {
                return;
            }
            if (!glyf[i].unicode) {
                glyf[i].unicode = [];
            }
            glyf[i].unicode.push(+c);
        });

        // advanceWidth
        ttf.hmtx.forEach((item, i) => {
            if (subsetMap && !subsetMap[i]) {
                return;
            }
            glyf[i].advanceWidth = item.advanceWidth;
            glyf[i].leftSideBearing = item.leftSideBearing;
        });

        // format = 2 的post表会携带glyf name信息
        if (ttf.post && 2 === ttf.post.format) {
            const nameIndex = ttf.post.nameIndex;
            const names = ttf.post.names;
            nameIndex.forEach((nameIndex, i) => {
                if (subsetMap && !subsetMap[i]) {
                    return;
                }
                if (nameIndex <= 257) {
                    glyf[i].name = postName[nameIndex];
                }
                else {
                    glyf[i].name = names[nameIndex - 258] || '';
                }
            });
        }

        // 设置了subsetMap之后需要选取subset中的字形
        // 并且对复合字形转换成简单字形
        if (subsetMap) {
            const subGlyf = [];
            Object.keys(subsetMap).forEach((i) => {
                i = +i;
                if (glyf[i].compound) {
                    compound2simpleglyf(i, ttf, true);
                }
                subGlyf.push(glyf[i]);
            });
            ttf.glyf = subGlyf;
            // 转换之后不存在复合字形了
            ttf.maxp.maxComponentElements = 0;
            ttf.maxp.maxComponentDepth = 0;
        }
    }

    /**
     * 清除非必须的表
     *
     * @param {Object} ttf ttf对象
     */
    cleanTables(ttf) {
        delete ttf.readOptions;
        delete ttf.tables;
        delete ttf.hmtx;
        delete ttf.loca;
        if (ttf.post) {
            delete ttf.post.nameIndex;
            delete ttf.post.names;
        }

        delete ttf.subsetMap;

        // 不携带hinting信息则删除hint相关表
        if (!this.options.hinting) {
            delete ttf.fpgm;
            delete ttf.cvt;
            delete ttf.prep;
            delete ttf.GPOS;
            delete ttf.kern;
            ttf.glyf.forEach((glyf) => {
                delete glyf.instructions;
            });
        }

        // 复合字形转简单字形
        if (this.options.compound2simple && ttf.maxp.maxComponentElements) {
            ttf.glyf.forEach((glyf, index) => {
                if (glyf.compound) {
                    compound2simpleglyf(index, ttf, true);
                }
            });
            ttf.maxp.maxComponentElements = 0;
            ttf.maxp.maxComponentDepth = 0;
        }
    }

    /**
     * 获取解析后的ttf文档
     *
     * @param {ArrayBuffer} buffer buffer对象
     * @return {Object} ttf文档
     */
    read(buffer) {
        this.ttf = this.readBuffer(buffer);
        this.resolveGlyf(this.ttf);
        this.cleanTables(this.ttf);
        return this.ttf;
    }

    /**
     * 注销
     */
    dispose() {
        delete this.ttf;
        delete this.options;
    }

}

/**
 * @file ttf table校验函数
 * @author mengke01(kekee000@gmail.com)
 */

function checkSumArrayBuffer(buffer, offset = 0, length) {
    length = length == null ? buffer.byteLength : length;

    if (offset + length > buffer.byteLength) {
        throw new Error('check sum out of bound');
    }

    const nLongs = Math.floor(length / 4);
    const view = new DataView(buffer, offset, length);
    let sum = 0;
    let i = 0;

    while (i < nLongs) {
        sum += view.getUint32(4 * i++, false);
    }

    let leftBytes = length - nLongs * 4;
    if (leftBytes) {
        offset = nLongs * 4;
        while (leftBytes > 0) {
            sum += view.getUint8(offset, false) << (leftBytes * 8);
            offset++;
            leftBytes--;
        }
    }
    return sum % 0x100000000;
}

function checkSumArray(buffer, offset = 0, length) {
    length = length || buffer.length;

    if (offset + length > buffer.length) {
        throw new Error('check sum out of bound');
    }

    const nLongs = Math.floor(length / 4);
    let sum = 0;
    let i = 0;

    while (i < nLongs) {
        sum += (buffer[i++] << 24)
            + (buffer[i++] << 16)
            + (buffer[i++] << 8)
            + buffer[i++];
    }

    let leftBytes = length - nLongs * 4;
    if (leftBytes) {
        offset = nLongs * 4;
        while (leftBytes > 0) {
            sum += buffer[offset] << (leftBytes * 8);
            offset++;
            leftBytes--;
        }
    }
    return sum % 0x100000000;
}


/**
 * table校验
 *
 * @param {ArrayBuffer|Array} buffer 表数据
 * @param {number=} offset 偏移量
 * @param {number=} length 长度
 *
 * @return {number} 校验和
 */
function checkSum(buffer, offset, length) {
    if (buffer instanceof ArrayBuffer) {
        return checkSumArrayBuffer(buffer, offset, length);
    }
    else if (buffer instanceof Array) {
        return checkSumArray(buffer, offset, length);
    }

    throw new Error('not support checksum buffer type');
}

/**
 * @file ttf写入器
 * @author mengke01(kekee000@gmail.com)
 */

// 支持写的表, 注意表顺序
const SUPPORT_TABLES = [
    'OS/2',
    'cmap',
    'glyf',
    'head',
    'hhea',
    'hmtx',
    'loca',
    'maxp',
    'name',
    'post'
];

class TTFWriter {
    constructor(options = {}) {
        this.options = {
            hinting: options.hinting || false, // 不保留hints信息
            support: options.support // 自定义的导出表结构，可以自己修改某些表项目
        };
    }

    /**
     * 处理ttf结构，以便于写
     *
     * @param {ttfObject} ttf ttf数据结构
     */
    resolveTTF(ttf) {

        // 头部信息
        ttf.version = ttf.version || 0x1;
        ttf.numTables = ttf.writeOptions.tables.length;
        ttf.entrySelector = Math.floor(Math.log(ttf.numTables) / Math.LN2);
        ttf.searchRange = Math.pow(2, ttf.entrySelector) * 16;
        ttf.rangeShift = ttf.numTables * 16 - ttf.searchRange;

        // 重置校验码
        ttf.head.checkSumAdjustment = 0;
        ttf.head.magickNumber = 0x5F0F3CF5;

        if (typeof ttf.head.created === 'string') {
            ttf.head.created = /^\d+$/.test(ttf.head.created)
                ? +ttf.head.created : Date.parse(ttf.head.created);
        }
        if (typeof ttf.head.modified === 'string') {
            ttf.head.modified = /^\d+$/.test(ttf.head.modified)
                ? +ttf.head.modified : Date.parse(ttf.head.modified);
        }
        // 重置日期
        if (!ttf.head.created) {
            ttf.head.created = Date.now();
        }
        if (!ttf.head.modified) {
            ttf.head.modified = ttf.head.created;
        }

        const checkUnicodeRepeat = {}; // 检查是否有重复代码点

        // 将glyf的代码点按小到大排序
        ttf.glyf.forEach((glyf, index) => {
            if (glyf.unicode) {
                glyf.unicode = glyf.unicode.sort();

                glyf.unicode.forEach((u) => {
                    if (checkUnicodeRepeat[u]) {
                        error.raise({
                            number: 10200,
                            data: index
                        }, index);
                    }
                    else {
                        checkUnicodeRepeat[u] = true;
                    }
                });

            }
        });
    }

    /**
     * 写ttf文件
     *
     * @param {ttfObject} ttf ttf数据结构
     * @return {ArrayBuffer} 字节流
     */
    dump(ttf) {

        // 用来做写入缓存的对象，用完后删掉
        ttf.support = Object.assign({}, this.options.support);

        // head + directory
        let ttfSize = 12 + ttf.numTables * 16;
        let ttfHeadOffset = 0; // 记录head的偏移

        // 构造tables
        ttf.support.tables = [];
        ttf.writeOptions.tables.forEach((tableName) => {
            const offset = ttfSize;
            const TableClass = supportTables[tableName];
            const tableSize = new TableClass().size(ttf); // 原始的表大小
            let size = tableSize; // 对齐后的表大小

            if (tableName === 'head') {
                ttfHeadOffset = offset;
            }

            // 4字节对齐
            if (size % 4) {
                size += 4 - size % 4;
            }

            ttf.support.tables.push({
                name: tableName,
                checkSum: 0,
                offset,
                length: tableSize,
                size
            });

            ttfSize += size;
        });

        const writer = new Writer(new ArrayBuffer(ttfSize));

        // 写头部
        writer.writeFixed(ttf.version);
        writer.writeUint16(ttf.numTables);
        writer.writeUint16(ttf.searchRange);
        writer.writeUint16(ttf.entrySelector);
        writer.writeUint16(ttf.rangeShift);

        // 写表偏移
        new Directory().write(writer, ttf);

        // 写支持的表数据
        ttf.support.tables.forEach((table) => {

            const tableStart = writer.offset;
            const TableClass = supportTables[table.name];
            new TableClass().write(writer, ttf);

            if (table.length % 4) {
                // 对齐字节
                writer.writeEmpty(4 - table.length % 4);
            }

            // 计算校验和
            table.checkSum = checkSum(writer.getBuffer(), tableStart, table.size);

        });

        // 重新写入每个表校验和
        ttf.support.tables.forEach((table, index) => {
            const offset = 12 + index * 16 + 4;
            writer.writeUint32(table.checkSum, offset);
        });

        // 写入总校验和
        const ttfCheckSum = (0xB1B0AFBA - checkSum(writer.getBuffer()) + 0x100000000) % 0x100000000;
        writer.writeUint32(ttfCheckSum, ttfHeadOffset + 8);

        delete ttf.writeOptions;
        delete ttf.support;

        const buffer = writer.getBuffer();
        writer.dispose();

        return buffer;
    }

    /**
     * 对ttf的表进行评估，标记需要处理的表
     *
     * @param  {Object} ttf ttf对象
     */
    prepareDump(ttf) {

        if (!ttf.glyf || ttf.glyf.length === 0) {
            error.raise(10201);
        }

        if (!ttf['OS/2'] || !ttf.head || !ttf.name) {
            error.raise(10204);
        }


        const tables = SUPPORT_TABLES.slice(0);
        ttf.writeOptions = {};
        // hinting tables direct copy
        if (this.options.hinting) {
            ['cvt', 'fpgm', 'prep', 'gasp', 'GPOS', 'kern'].forEach((table) => {
                if (ttf[table]) {
                    tables.push(table);
                }
            });
        }

        ttf.writeOptions.hinting = !!this.options.hinting;
        ttf.writeOptions.tables = tables.sort();
    }

    /**
     * 写一个ttf字体结构
     *
     * @param {Object} ttf ttf数据结构
     * @return {ArrayBuffer} 缓冲数组
     */
    write(ttf) {
        this.prepareDump(ttf);
        this.resolveTTF(ttf);
        const buffer = this.dump(ttf);
        return buffer;
    }

    /**
     * 注销
     */
    dispose() {
        delete this.options;
    }
}

/**
 * @file ttf转eot
 * @author mengke01(kekee000@gmail.com)
 *
 * reference:
 * http://www.w3.org/Submission/EOT/
 * https://github.com/fontello/ttf2eot/blob/master/index.js
 */

const EotHead = table.create(
    'head',
    [
        ['EOTSize', struct.Uint32],
        ['FontDataSize', struct.Uint32],
        ['Version', struct.Uint32],
        ['Flags', struct.Uint32],
        ['PANOSE', struct.Bytes, 10],
        ['Charset', struct.Uint8],
        ['Italic', struct.Uint8],
        ['Weight', struct.Uint32],
        ['fsType', struct.Uint16],
        ['MagicNumber', struct.Uint16],
        ['UnicodeRange', struct.Bytes, 16],
        ['CodePageRange', struct.Bytes, 8],
        ['CheckSumAdjustment', struct.Uint32],
        ['Reserved', struct.Bytes, 16],
        ['Padding1', struct.Uint16]
    ]
);

/**
 * ttf格式转换成eot字体格式
 *
 * @param {ArrayBuffer} ttfBuffer ttf缓冲数组
 * @param {Object} options 选项
 * @return {ArrayBuffer} eot格式byte流
 */
// eslint-disable-next-line no-unused-vars
function ttf2eot(ttfBuffer, options = {}) {
    // 构造eot头部
    const eotHead = new EotHead();
    const eotHeaderSize = eotHead.size();
    const eot = {};
    eot.head = eotHead.read(new Reader(new ArrayBuffer(eotHeaderSize)));

    // set fields
    eot.head.FontDataSize = ttfBuffer.byteLength || ttfBuffer.length;
    eot.head.Version = 0x20001;
    eot.head.Flags = 0;
    eot.head.Charset = 0x1;
    eot.head.MagicNumber = 0x504C;
    eot.head.Padding1 = 0;

    const ttfReader = new Reader(ttfBuffer);
    // 读取ttf表个数
    const numTables = ttfReader.readUint16(4);

    if (numTables <= 0 || numTables > 100) {
        error.raise(10101);
    }

    // 读取ttf表索引信息
    ttfReader.seek(12);
    // 需要读取3个表内容，设置3个byte
    let tblReaded = 0;
    for (let i = 0; i < numTables && tblReaded !== 0x7; ++i) {

        const tableEntry = {
            tag: ttfReader.readString(ttfReader.offset, 4),
            checkSum: ttfReader.readUint32(),
            offset: ttfReader.readUint32(),
            length: ttfReader.readUint32()
        };

        const entryOffset = ttfReader.offset;

        if (tableEntry.tag === 'head') {
            eot.head.CheckSumAdjustment = ttfReader.readUint32(tableEntry.offset + 8);
            tblReaded += 0x1;
        }
        else if (tableEntry.tag === 'OS/2') {
            eot.head.PANOSE = ttfReader.readBytes(tableEntry.offset + 32, 10);
            eot.head.Italic = ttfReader.readUint16(tableEntry.offset + 62);
            eot.head.Weight = ttfReader.readUint16(tableEntry.offset + 4);
            eot.head.fsType = ttfReader.readUint16(tableEntry.offset + 8);
            eot.head.UnicodeRange = ttfReader.readBytes(tableEntry.offset + 42, 16);
            eot.head.CodePageRange = ttfReader.readBytes(tableEntry.offset + 78, 8);
            tblReaded += 0x2;
        }

        // 设置名字信息
        else if (tableEntry.tag === 'name') {
            const names = new NameTbl(tableEntry.offset).read(ttfReader);

            eot.FamilyName = utilString.toUCS2Bytes(names.fontFamily || '');
            eot.FamilyNameSize = eot.FamilyName.length;

            eot.StyleName = utilString.toUCS2Bytes(names.fontStyle || '');
            eot.StyleNameSize = eot.StyleName.length;

            eot.VersionName = utilString.toUCS2Bytes(names.version || '');
            eot.VersionNameSize = eot.VersionName.length;

            eot.FullName = utilString.toUCS2Bytes(names.fullName || '');
            eot.FullNameSize = eot.FullName.length;

            tblReaded += 0x3;
        }

        ttfReader.seek(entryOffset);
    }

    // 计算size
    eot.head.EOTSize = eotHeaderSize
        + 4 + eot.FamilyNameSize
        + 4 + eot.StyleNameSize
        + 4 + eot.VersionNameSize
        + 4 + eot.FullNameSize
        + 2
        + eot.head.FontDataSize;

    // 这里用小尾方式写入
    const eotWriter = new Writer(new ArrayBuffer(eot.head.EOTSize), 0, eot.head.EOTSize, true);

    // write head
    eotHead.write(eotWriter, eot);

    // write names
    eotWriter.writeUint16(eot.FamilyNameSize);
    eotWriter.writeBytes(eot.FamilyName, eot.FamilyNameSize);
    eotWriter.writeUint16(0);

    eotWriter.writeUint16(eot.StyleNameSize);
    eotWriter.writeBytes(eot.StyleName, eot.StyleNameSize);
    eotWriter.writeUint16(0);

    eotWriter.writeUint16(eot.VersionNameSize);
    eotWriter.writeBytes(eot.VersionName, eot.VersionNameSize);
    eotWriter.writeUint16(0);

    eotWriter.writeUint16(eot.FullNameSize);
    eotWriter.writeBytes(eot.FullName, eot.FullNameSize);
    eotWriter.writeUint16(0);

    // write rootstring
    eotWriter.writeUint16(0);

    eotWriter.writeBytes(ttfBuffer, eot.head.FontDataSize);

    return eotWriter.getBuffer();
}

/**
 * @file ttf转换为woff
 * @author mengke01(kekee000@gmail.com)
 *
 * woff format:
 * http://www.w3.org/TR/2012/REC-WOFF-20121213/
 *
 * references:
 * https://github.com/fontello/ttf2woff
 * https://github.com/nodeca/pako
 */

/**
 * metadata 转换成XML
 *
 * @param {Object} metadata metadata
 *
 * @example
 * metadata json:
 *
 *    {
 *        "uniqueid": "",
 *        "vendor": {
 *            "name": "",
 *            "url": ""
 *        },
 *        "credit": [
 *            {
 *                "name": "",
 *                "url": "",
 *                "role": ""
 *            }
 *        ],
 *        "description": "",
 *        "license": {
 *            "id": "",
 *            "url": "",
 *            "text": ""
 *        },
 *        "copyright": "",
 *        "trademark": "",
 *        "licensee": ""
 *    }
 *
 * @return {string} xml字符串
 */
function metadata2xml(metadata) {
    let xml = ''
        + '<?xml version="1.0" encoding="UTF-8"?>'
        +   '<metadata version="1.0">';

    metadata.uniqueid = metadata.uniqueid || (config.fontId + '.' + Date.now());
    xml += '<uniqueid id="' + string.encodeHTML(metadata.uniqueid) + '" />';

    if (metadata.vendor) {
        xml += '<vendor name="' + string.encodeHTML(metadata.vendor.name) + '"'
            +     ' url="' + string.encodeHTML(metadata.vendor.url) + '" />';
    }

    if (metadata.credit) {
        xml += '<credits>';
        const credits = metadata.credit instanceof Array ? metadata.credit : [metadata.credit];

        credits.forEach((credit) => {
            xml += '<credit name="' + string.encodeHTML(credit.name) + '"'
                +     ' url="' + string.encodeHTML(credit.url) + '"'
                +     ' role="' + string.encodeHTML(credit.role || 'Contributor') + '" />';
        });

        xml += '</credits>';
    }

    if (metadata.description) {
        xml += '<description><text xml:lang="en">'
            +     string.encodeHTML(metadata.description)
            +  '</text></description>';
    }

    if (metadata.license) {
        xml += '<license url="' + string.encodeHTML(metadata.license.url) + '"'
            +      ' id="' + string.encodeHTML(metadata.license.id) + '"><text xml:lang="en">';
        xml += string.encodeHTML(metadata.license.text);
        xml += '</text></license>';
    }

    if (metadata.copyright) {
        xml += '<copyright><text xml:lang="en">';
        xml += string.encodeHTML(metadata.copyright);
        xml += '</text></copyright>';
    }

    if (metadata.trademark) {
        xml += '<trademark><text xml:lang="en">'
            + string.encodeHTML(metadata.trademark)
            +  '</text></trademark>';
    }

    if (metadata.licensee) {
        xml += '<licensee name="' + string.encodeHTML(metadata.licensee) + '"/>';
    }

    xml += '</metadata>';

    return xml;
}


/**
 * ttf格式转换成woff字体格式
 *
 * @param {ArrayBuffer} ttfBuffer ttf缓冲数组
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 * @param {Object} options.deflate 压缩相关函数
 *
 * @return {ArrayBuffer} woff格式byte流
 */
function ttf2woff(ttfBuffer, options = {}) {

    // woff 头部结构
    const woffHeader = {
        signature: 0x774F4646, // for woff
        flavor: 0x10000, // for ttf
        length: 0,
        numTables: 0,
        reserved: 0,
        totalSfntSize: 0,
        majorVersion: 0,
        minorVersion: 0,
        metaOffset: 0,
        metaLength: 0,
        metaOrigLength: 0,
        privOffset: 0,
        privLength: 0
    };

    const ttfReader = new Reader(ttfBuffer);
    let tableEntries = [];
    const numTables = ttfReader.readUint16(4); // 读取ttf表个数
    let tableEntry;
    let deflatedData;
    let i;
    let l;

    if (numTables <= 0 || numTables > 100) {
        error.raise(10101);
    }

    // 读取ttf表索引信息
    ttfReader.seek(12);

    for (i = 0; i < numTables; ++i) {

        tableEntry = {
            tag: ttfReader.readString(ttfReader.offset, 4),
            checkSum: ttfReader.readUint32(),
            offset: ttfReader.readUint32(),
            length: ttfReader.readUint32()
        };

        const entryOffset = ttfReader.offset;

        if (tableEntry.tag === 'head') {
            // 读取font revision
            woffHeader.majorVersion = ttfReader.readUint16(tableEntry.offset + 4);
            woffHeader.minorVersion = ttfReader.readUint16(tableEntry.offset + 6);
        }

        // ttf 表数据
        const sfntData = ttfReader.readBytes(tableEntry.offset, tableEntry.length);

        // 对数据进行压缩
        if (options.deflate) {
            deflatedData = options.deflate(sfntData);

            // 这里需要判断是否压缩后数据小于原始数据
            if (deflatedData.length < sfntData.length) {
                tableEntry.data = deflatedData;
                tableEntry.deflated = true;
            }
            else {
                tableEntry.data = sfntData;
            }
        }
        else {
            tableEntry.data = sfntData;
        }

        tableEntry.compLength = tableEntry.data.length;
        tableEntries.push(tableEntry);
        ttfReader.seek(entryOffset);
    }

    if (!tableEntries.length) {
        error.raise(10204);
    }

    // 对table进行排序
    tableEntries = tableEntries.sort((a, b) => a.tag === b.tag ? 0 : a.tag < b.tag ? -1 : 1);

    // 计算offset和 woff size
    let woffSize = 44 + 20 * numTables; // header size + table entries
    let ttfSize = 12 + 16 * numTables;

    for (i = 0, l = tableEntries.length; i < l; ++i) {
        tableEntry = tableEntries[i];
        tableEntry.offset = woffSize;
        // 4字节对齐
        woffSize += tableEntry.compLength + (tableEntry.compLength % 4 ? 4 - tableEntry.compLength % 4 : 0);
        ttfSize += tableEntry.length + (tableEntry.length % 4 ? 4 - tableEntry.length % 4 : 0);
    }

    // 计算metaData
    let metadata = null;
    if (options.metadata) {
        const xml = utilString.toUTF8Bytes(metadata2xml(options.metadata));

        if (options.deflate) {
            deflatedData = options.deflate(xml);
            if (deflatedData.length < xml.length) {
                metadata = deflatedData;
            }
            else {
                metadata = xml;
            }
        }
        else {
            metadata = xml;
        }

        woffHeader.metaLength = metadata.length;
        woffHeader.metaOrigLength = xml.length;
        woffHeader.metaOffset = woffSize;
        // metadata header + length
        woffSize += woffHeader.metaLength + (woffHeader.metaLength % 4 ? 4 - woffHeader.metaLength % 4 : 0);
    }

    woffHeader.numTables = tableEntries.length;
    woffHeader.length = woffSize;
    woffHeader.totalSfntSize = ttfSize;

    // 写woff数据
    const woffWriter = new Writer(new ArrayBuffer(woffSize));

    // 写woff头部
    woffWriter.writeUint32(woffHeader.signature);
    woffWriter.writeUint32(woffHeader.flavor);
    woffWriter.writeUint32(woffHeader.length);
    woffWriter.writeUint16(woffHeader.numTables);
    woffWriter.writeUint16(woffHeader.reserved);
    woffWriter.writeUint32(woffHeader.totalSfntSize);
    woffWriter.writeUint16(woffHeader.majorVersion);
    woffWriter.writeUint16(woffHeader.minorVersion);
    woffWriter.writeUint32(woffHeader.metaOffset);
    woffWriter.writeUint32(woffHeader.metaLength);
    woffWriter.writeUint32(woffHeader.metaOrigLength);
    woffWriter.writeUint32(woffHeader.privOffset);
    woffWriter.writeUint32(woffHeader.privLength);


    // 写woff表索引
    for (i = 0, l = tableEntries.length; i < l; ++i) {
        tableEntry = tableEntries[i];
        woffWriter.writeString(tableEntry.tag);
        woffWriter.writeUint32(tableEntry.offset);
        woffWriter.writeUint32(tableEntry.compLength);
        woffWriter.writeUint32(tableEntry.length);
        woffWriter.writeUint32(tableEntry.checkSum);
    }

    // 写表数据
    for (i = 0, l = tableEntries.length; i < l; ++i) {
        tableEntry = tableEntries[i];
        woffWriter.writeBytes(tableEntry.data);

        if (tableEntry.compLength % 4) {
            woffWriter.writeEmpty(4 - tableEntry.compLength % 4);
        }
    }

    // 写metadata
    if (metadata) {
        woffWriter.writeBytes(metadata);
        if (woffHeader.metaLength % 4) {
            woffWriter.writeEmpty(4 - woffHeader.metaLength % 4);
        }
    }

    return woffWriter.getBuffer();
}

/**
 * @file 将ttf路径转换为svg路径`d`
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 将路径转换为svg路径
 *
 * @param {Array} contour 轮廓序列
 * @param {number} precision 精确度
 * @return {string} 路径
 */
function contour2svg(contour, precision = 2) {
    if (!contour.length) {
        return '';
    }

    const ceil = function (number) {
        return +(number).toFixed(precision);
    };
    const pathArr = [];
    let curPoint;
    let prevPoint;
    let nextPoint;
    let x; // x相对坐标
    let y; // y相对坐标
    for (let i = 0, l = contour.length; i < l; i++) {
        curPoint = contour[i];
        prevPoint = i === 0 ? contour[l - 1] : contour[i - 1];
        nextPoint = i === l - 1 ? contour[0] : contour[i + 1];

        // 起始坐标
        if (i === 0) {
            if (curPoint.onCurve) {
                x = curPoint.x;
                y = curPoint.y;
                pathArr.push('M' + ceil(x) + ' ' + ceil(y));
            }
            else if (prevPoint.onCurve) {
                x = prevPoint.x;
                y = prevPoint.y;
                pathArr.push('M' + ceil(x) + ' ' + ceil(y));
            }
            else {
                x = (prevPoint.x + curPoint.x) / 2;
                y = (prevPoint.y + curPoint.y) / 2;
                pathArr.push('M' + ceil(x) + ' ' + ceil(y));
            }
        }

        // 直线
        if (curPoint.onCurve && nextPoint.onCurve) {
            pathArr.push('l' + ceil(nextPoint.x - x)
                + ' ' + ceil(nextPoint.y - y));
            x = nextPoint.x;
            y = nextPoint.y;
        }
        else if (!curPoint.onCurve) {
            if (nextPoint.onCurve) {
                pathArr.push('q' + ceil(curPoint.x - x)
                    + ' ' + ceil(curPoint.y - y)
                    + ' ' + ceil(nextPoint.x - x)
                    + ' ' + ceil(nextPoint.y - y));
                x = nextPoint.x;
                y = nextPoint.y;
            }
            else {
                const x1 = (curPoint.x + nextPoint.x) / 2;
                const y1 = (curPoint.y + nextPoint.y) / 2;
                pathArr.push('q' + ceil(curPoint.x - x)
                        + ' ' + ceil(curPoint.y - y)
                        + ' ' + ceil(x1 - x)
                        + ' ' + ceil(y1 - y));
                x = x1;
                y = y1;
            }
        }
    }
    pathArr.push('Z');
    return pathArr.join(' ');
}

/**
 * @file 将ttf字形转换为svg路径`d`
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * contours轮廓转svgpath
 *
 * @param {Array} contours 轮廓list
 * @param {number} precision 精确度
 * @return {string} path字符串
 */
function contours2svg(contours, precision) {

    if (!contours.length) {
        return '';
    }

    return contours.map((contour) => contour2svg(contour, precision)).join('');
}

/**
 * @file unicode字符转xml字符编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * unicode 转xml编码格式
 *
 * @param {Array.<number>} unicodeList unicode字符列表
 * @return {string} xml编码格式
 */
function unicode2xml(unicodeList) {
    if (typeof unicodeList === 'number') {
        unicodeList = [unicodeList];
    }
    return unicodeList.map(u => {
        if (u < 0x20) {
            return '';
        }
        return u >= 0x20 && u <= 255
            ? string.encodeHTML(String.fromCharCode(u))
            : '&#x' + u.toString(16) + ';';
    }).join('');
}

/**
 * @file ttf转svg
 * @author mengke01(kekee000@gmail.com)
 *
 * references:
 * http://www.w3.org/TR/SVG11/fonts.html
 */

// svg font id
const SVG_FONT_ID = config.fontId;

// xml 模板
/* eslint-disable no-multi-spaces */
const XML_TPL$1 = ''
    + '<?xml version="1.0" standalone="no"?>'
    +   '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >'
    +   '<svg xmlns="http://www.w3.org/2000/svg">'
    +   '<metadata>${metadata}</metadata>'
    +   '<defs><font id="${id}" horiz-adv-x="${advanceWidth}">'
    +       '<font-face font-family="${fontFamily}" font-weight="${fontWeight}" font-stretch="normal"'
    +           ' units-per-em="${unitsPerEm}" panose-1="${panose}" ascent="${ascent}" descent="${descent}"'
    +           ' x-height="${xHeight}" bbox="${bbox}" underline-thickness="${underlineThickness}"'
    +           ' underline-position="${underlinePosition}" unicode-range="${unicodeRange}" />'
    +       '<missing-glyph horiz-adv-x="${missing.advanceWidth}" ${missing.d} />'
    +       '${glyphList}'
    +   '</font></defs>'
    + '</svg>';
/* eslint-enable no-multi-spaces */
// glyph 模板
const GLYPH_TPL = '<glyph glyph-name="${name}" unicode="${unicode}" d="${d}" />';

/**
 * ttf数据结构转svg
 *
 * @param {ttfObject} ttf ttfObject对象
 * @param {Object} options 选项
 * @param {string} options.metadata 字体相关的信息
 * @return {string} svg字符串
 */
function ttfobject2svg(ttf, options) {

    const OS2 = ttf['OS/2'];

    // 用来填充xml的数据
    const xmlObject = {
        id: ttf.name.uniqueSubFamily || SVG_FONT_ID,
        metadata: string.encodeHTML(options.metadata || ''),
        advanceWidth: ttf.hhea.advanceWidthMax,
        fontFamily: ttf.name.fontFamily,
        fontWeight: OS2.usWeightClass,
        unitsPerEm: ttf.head.unitsPerEm,
        panose: [
            OS2.bFamilyType, OS2.bSerifStyle, OS2.bWeight, OS2.bProportion, OS2.bContrast,
            OS2.bStrokeVariation, OS2.bArmStyle, OS2.bLetterform, OS2.bMidline, OS2.bXHeight
        ].join(' '),
        ascent: ttf.hhea.ascent,
        descent: ttf.hhea.descent,
        xHeight: OS2.bXHeight,
        bbox: [ttf.head.xMin, ttf.head.yMin, ttf.head.xMax, ttf.head.yMax].join(' '),
        underlineThickness: ttf.post.underlineThickness,
        underlinePosition: ttf.post.underlinePosition,
        unicodeRange: 'U+' + string.pad(OS2.usFirstCharIndex.toString(16), 4)
            + '-' + string.pad(OS2.usLastCharIndex.toString(16), 4)
    };

    // glyf 第一个为missing glyph
    xmlObject.missing = {};
    xmlObject.missing.advanceWidth = ttf.glyf[0].advanceWidth || 0;
    xmlObject.missing.d = ttf.glyf[0].contours && ttf.glyf[0].contours.length
        ? 'd="' + contours2svg(ttf.glyf[0].contours) + '"'
        : '';

    // glyf 信息
    let glyphList = '';
    for (let i = 1, l = ttf.glyf.length; i < l; i++) {
        const glyf = ttf.glyf[i];

        // 筛选简单字形，并且有轮廓，有编码
        if (!glyf.compound && glyf.contours && glyf.unicode && glyf.unicode.length) {
            const glyfObject = {
                name: utilString.escape(glyf.name),
                unicode: unicode2xml(glyf.unicode),
                d: contours2svg(glyf.contours)
            };
            glyphList += string.format(GLYPH_TPL, glyfObject);
        }
    }
    xmlObject.glyphList = glyphList;

    return string.format(XML_TPL$1, xmlObject);
}


/**
 * ttf格式转换成svg字体格式
 *
 * @param {ArrayBuffer|ttfObject} ttfBuffer ttf缓冲数组或者ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 *
 * @return {string} svg字符串
 */
function ttf2svg(ttfBuffer, options = {}) {

    // 读取ttf二进制流
    if (ttfBuffer instanceof ArrayBuffer) {
        const reader = new TTFReader();
        const ttfObject = reader.read(ttfBuffer);
        reader.dispose();

        return ttfobject2svg(ttfObject, options);
    }
    // 读取ttfObject
    else if (ttfBuffer.version && ttfBuffer.glyf) {

        return ttfobject2svg(ttfBuffer, options);
    }

    error.raise(10109);
}

/**
 * @file ttf 转 svg symbol
 * @author mengke01(kekee000@gmail.com)
 */

// xml 模板
const XML_TPL = ''
    + '<svg style="position: absolute; width: 0; height: 0;" width="0" height="0" version="1.1"'
    + ' xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
    + '<defs>${symbolList}</defs>'
    + '</svg>';

// symbol 模板
const SYMBOL_TPL = ''
    + '<symbol id="${id}" viewBox="0 ${descent} ${unitsPerEm} ${unitsPerEm}">'
    + '<path d="${d}"></path>'
    + '</symbol>';


/**
 * 根据 glyf 获取 symbo 名称
 * 1. 有 `name` 属性则使用 name 属性
 * 2. 有 `unicode` 属性则取 unicode 第一个: 'uni' + unicode
 * 3. 使用索引号作为 id: 'symbol' + index
 *
 * @param  {Object} glyf  glyf 对象
 * @param  {number} index glyf 索引
 * @return {string}
 */
function getSymbolId(glyf, index) {
    if (glyf.name) {
        return glyf.name;
    }

    if (glyf.unicode && glyf.unicode.length) {
        return 'uni-' + glyf.unicode[0];
    }
    return 'symbol-' + index;
}

/**
 * ttf数据结构转svg
 *
 * @param {ttfObject} ttf ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 * @return {string} svg字符串
 */
// eslint-disable-next-line no-unused-vars
function ttfobject2symbol(ttf, options = {}) {
    const xmlObject = {};
    const unitsPerEm = ttf.head.unitsPerEm;
    const descent = ttf.hhea.descent;
    // glyf 信息
    let symbolList = '';
    for (let i = 1, l = ttf.glyf.length; i < l; i++) {
        const glyf = ttf.glyf[i];
        // 筛选简单字形，并且有轮廓，有编码
        if (!glyf.compound && glyf.contours) {
            const contours = pathsUtil.flip(glyf.contours);
            const glyfObject = {
                descent,
                unitsPerEm,
                id: getSymbolId(glyf, i),
                d: contours2svg(contours)
            };
            symbolList += string.format(SYMBOL_TPL, glyfObject);
        }
    }
    xmlObject.symbolList = symbolList;
    return string.format(XML_TPL, xmlObject);
}


/**
 * ttf格式转换成svg字体格式
 *
 * @param {ArrayBuffer|ttfObject} ttfBuffer ttf缓冲数组或者ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 *
 * @return {string} svg字符串
 */
function ttf2symbol(ttfBuffer, options = {}) {

    // 读取ttf二进制流
    if (ttfBuffer instanceof ArrayBuffer) {
        const reader = new TTFReader();
        const ttfObject = reader.read(ttfBuffer);
        reader.dispose();

        return ttfobject2symbol(ttfObject, options);
    }
    // 读取ttfObject
    else if (ttfBuffer.version && ttfBuffer.glyf) {

        return ttfobject2symbol(ttfBuffer, options);
    }

    error.raise(10112);
}

var woff2$1 = {exports: {}};

(function (module, exports) {
var Module = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  return (
function(Module) {
  Module = Module || {};
var Module=typeof Module!=="undefined"?Module:{};var moduleOverrides={};var key;for(key in Module){if(Module.hasOwnProperty(key)){moduleOverrides[key]=Module[key];}}var quit_=function(status,toThrow){throw toThrow};var ENVIRONMENT_IS_WEB=false;var ENVIRONMENT_IS_WORKER=false;var ENVIRONMENT_IS_NODE=false;var ENVIRONMENT_HAS_NODE=false;var ENVIRONMENT_IS_SHELL=false;ENVIRONMENT_IS_WEB=typeof window==="object";ENVIRONMENT_IS_WORKER=typeof importScripts==="function";ENVIRONMENT_HAS_NODE=typeof process==="object"&&typeof process.versions==="object"&&typeof process.versions.node==="string";ENVIRONMENT_IS_NODE=ENVIRONMENT_HAS_NODE&&!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_WORKER;ENVIRONMENT_IS_SHELL=!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_NODE&&!ENVIRONMENT_IS_WORKER;if(Module["ENVIRONMENT"]){throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -s ENVIRONMENT=web or -s ENVIRONMENT=node)")}var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var read_,readBinary;if(ENVIRONMENT_IS_NODE){scriptDirectory=__dirname+"/";var nodeFS;var nodePath;read_=function shell_read(filename,binary){var ret;if(!nodeFS)nodeFS=commonjsRequire(["fs"].join());if(!nodePath)nodePath=commonjsRequire(["path"].join());filename=nodePath["normalize"](filename);ret=nodeFS["readFileSync"](filename);return binary?ret:ret.toString()};readBinary=function readBinary(filename){var ret=read_(filename,true);if(!ret.buffer){ret=new Uint8Array(ret);}assert(ret.buffer);return ret};if(process["argv"].length>1){process["argv"][1].replace(/\\/g,"/");}process["argv"].slice(2);process["on"]("uncaughtException",function(ex){if(!(ex instanceof ExitStatus)){throw ex}});process["on"]("unhandledRejection",abort);quit_=function(status){process["exit"](status);};Module["inspect"]=function(){return "[Emscripten Module object]"};}else if(ENVIRONMENT_IS_SHELL){if(typeof read!="undefined"){read_=function shell_read(f){return read(f)};}readBinary=function readBinary(f){var data;if(typeof readbuffer==="function"){return new Uint8Array(readbuffer(f))}data=read(f,"binary");assert(typeof data==="object");return data};if(typeof scriptArgs!="undefined"){scriptArgs;}if(typeof quit==="function"){quit_=function(status){quit(status);};}if(typeof print!=="undefined"){if(typeof console==="undefined")console={};console.log=print;console.warn=console.error=typeof printErr!=="undefined"?printErr:print;}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href;}else if(document.currentScript){scriptDirectory=document.currentScript.src;}if(_scriptDir){scriptDirectory=_scriptDir;}if(scriptDirectory.indexOf("blob:")!==0){scriptDirectory=scriptDirectory.substr(0,scriptDirectory.lastIndexOf("/")+1);}else {scriptDirectory="";}read_=function shell_read(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText};if(ENVIRONMENT_IS_WORKER){readBinary=function readBinary(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)};}}else {throw new Error("environment detection error")}var out=Module["print"]||function(){};var err=Module["printErr"]||function(){};for(key in moduleOverrides){if(moduleOverrides.hasOwnProperty(key)){Module[key]=moduleOverrides[key];}}moduleOverrides=null;if(Module["arguments"]);if(!Object.getOwnPropertyDescriptor(Module,"arguments"))Object.defineProperty(Module,"arguments",{configurable:true,get:function(){abort("Module.arguments has been replaced with plain arguments_");}});if(Module["thisProgram"]);if(!Object.getOwnPropertyDescriptor(Module,"thisProgram"))Object.defineProperty(Module,"thisProgram",{configurable:true,get:function(){abort("Module.thisProgram has been replaced with plain thisProgram");}});if(Module["quit"])quit_=Module["quit"];if(!Object.getOwnPropertyDescriptor(Module,"quit"))Object.defineProperty(Module,"quit",{configurable:true,get:function(){abort("Module.quit has been replaced with plain quit_");}});assert(typeof Module["memoryInitializerPrefixURL"]==="undefined","Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");assert(typeof Module["pthreadMainPrefixURL"]==="undefined","Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");assert(typeof Module["cdInitializerPrefixURL"]==="undefined","Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");assert(typeof Module["filePackagePrefixURL"]==="undefined","Module.filePackagePrefixURL option was removed, use Module.locateFile instead");assert(typeof Module["read"]==="undefined","Module.read option was removed (modify read_ in JS)");assert(typeof Module["readAsync"]==="undefined","Module.readAsync option was removed (modify readAsync in JS)");assert(typeof Module["readBinary"]==="undefined","Module.readBinary option was removed (modify readBinary in JS)");assert(typeof Module["setWindowTitle"]==="undefined","Module.setWindowTitle option was removed (modify setWindowTitle in JS)");if(!Object.getOwnPropertyDescriptor(Module,"read"))Object.defineProperty(Module,"read",{configurable:true,get:function(){abort("Module.read has been replaced with plain read_");}});if(!Object.getOwnPropertyDescriptor(Module,"readAsync"))Object.defineProperty(Module,"readAsync",{configurable:true,get:function(){abort("Module.readAsync has been replaced with plain readAsync");}});if(!Object.getOwnPropertyDescriptor(Module,"readBinary"))Object.defineProperty(Module,"readBinary",{configurable:true,get:function(){abort("Module.readBinary has been replaced with plain readBinary");}});stackSave=stackRestore=stackAlloc=function(){abort("cannot use the stack before compiled code is ready to run, and has provided stack access");};function warnOnce(text){if(!warnOnce.shown)warnOnce.shown={};if(!warnOnce.shown[text]){warnOnce.shown[text]=1;err(text);}}var asm2wasmImports={"f64-rem":function(x,y){return x%y},"debugger":function(){debugger}};new Array(0);var setTempRet0=function(value){};var wasmBinary;if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(!Object.getOwnPropertyDescriptor(Module,"wasmBinary"))Object.defineProperty(Module,"wasmBinary",{configurable:true,get:function(){abort("Module.wasmBinary has been replaced with plain wasmBinary");}});var noExitRuntime;if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(!Object.getOwnPropertyDescriptor(Module,"noExitRuntime"))Object.defineProperty(Module,"noExitRuntime",{configurable:true,get:function(){abort("Module.noExitRuntime has been replaced with plain noExitRuntime");}});if(typeof WebAssembly!=="object"){abort("No WebAssembly support found. Build with -s WASM=0 to target JavaScript instead.");}var wasmMemory;var wasmTable=new WebAssembly.Table({"initial":352,"maximum":352,"element":"anyfunc"});var ABORT=false;function assert(condition,text){if(!condition){abort("Assertion failed: "+text);}}function getCFunc(ident){var func=Module["_"+ident];assert(func,"Cannot call unknown function "+ident+", make sure it is exported");return func}function ccall(ident,returnType,argTypes,args,opts){var toC={"string":function(str){var ret=0;if(str!==null&&str!==undefined&&str!==0){var len=(str.length<<2)+1;ret=stackAlloc(len);stringToUTF8(str,ret,len);}return ret},"array":function(arr){var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string")return UTF8ToString(ret);if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;assert(returnType!=="array",'Return type should not be "array".');if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i]);}else {cArgs[i]=args[i];}}}var ret=func.apply(null,cArgs);ret=convertReturnValue(ret);if(stack!==0)stackRestore(stack);return ret}function cwrap(ident,returnType,argTypes,opts){return function(){return ccall(ident,returnType,argTypes,arguments)}}var UTF8Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf8"):undefined;function UTF8ArrayToString(u8Array,idx,maxBytesToRead){var endIdx=idx+maxBytesToRead;var endPtr=idx;while(u8Array[endPtr]&&!(endPtr>=endIdx))++endPtr;if(endPtr-idx>16&&u8Array.subarray&&UTF8Decoder){return UTF8Decoder.decode(u8Array.subarray(idx,endPtr))}else {var str="";while(idx<endPtr){var u0=u8Array[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=u8Array[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=u8Array[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2;}else {if((u0&248)!=240)warnOnce("Invalid UTF-8 leading byte 0x"+u0.toString(16)+" encountered when deserializing a UTF-8 string on the asm.js/wasm heap to a JS string!");u0=(u0&7)<<18|u1<<12|u2<<6|u8Array[idx++]&63;}if(u0<65536){str+=String.fromCharCode(u0);}else {var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023);}}}return str}function UTF8ToString(ptr,maxBytesToRead){return ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead):""}function stringToUTF8Array(str,outU8Array,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343){var u1=str.charCodeAt(++i);u=65536+((u&1023)<<10)|u1&1023;}if(u<=127){if(outIdx>=endIdx)break;outU8Array[outIdx++]=u;}else if(u<=2047){if(outIdx+1>=endIdx)break;outU8Array[outIdx++]=192|u>>6;outU8Array[outIdx++]=128|u&63;}else if(u<=65535){if(outIdx+2>=endIdx)break;outU8Array[outIdx++]=224|u>>12;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63;}else {if(outIdx+3>=endIdx)break;if(u>=2097152)warnOnce("Invalid Unicode code point 0x"+u.toString(16)+" encountered when serializing a JS string to an UTF-8 string on the asm.js/wasm heap! (Valid unicode code points should be in range 0-0x1FFFFF).");outU8Array[outIdx++]=240|u>>18;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63;}}outU8Array[outIdx]=0;return outIdx-startIdx}function stringToUTF8(str,outPtr,maxBytesToWrite){assert(typeof maxBytesToWrite=="number","stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127)++len;else if(u<=2047)len+=2;else if(u<=65535)len+=3;else len+=4;}return len}typeof TextDecoder!=="undefined"?new TextDecoder("utf-16le"):undefined;function writeArrayToMemory(array,buffer){assert(array.length>=0,"writeArrayToMemory array must have a length (should be an array or typed array)");HEAP8.set(array,buffer);}var WASM_PAGE_SIZE=65536;function alignUp(x,multiple){if(x%multiple>0){x+=multiple-x%multiple;}return x}var buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateGlobalBufferAndViews(buf){buffer=buf;Module["HEAP8"]=HEAP8=new Int8Array(buf);Module["HEAP16"]=HEAP16=new Int16Array(buf);Module["HEAP32"]=HEAP32=new Int32Array(buf);Module["HEAPU8"]=HEAPU8=new Uint8Array(buf);Module["HEAPU16"]=HEAPU16=new Uint16Array(buf);Module["HEAPU32"]=HEAPU32=new Uint32Array(buf);Module["HEAPF32"]=HEAPF32=new Float32Array(buf);Module["HEAPF64"]=HEAPF64=new Float64Array(buf);}var STACK_BASE=434112,STACK_MAX=5676992,DYNAMIC_BASE=5676992,DYNAMICTOP_PTR=433920;assert(STACK_BASE%16===0,"stack must start aligned");assert(DYNAMIC_BASE%16===0,"heap must start aligned");var TOTAL_STACK=5242880;if(Module["TOTAL_STACK"])assert(TOTAL_STACK===Module["TOTAL_STACK"],"the stack size can no longer be determined at runtime");var INITIAL_TOTAL_MEMORY=Module["TOTAL_MEMORY"]||16777216;if(!Object.getOwnPropertyDescriptor(Module,"TOTAL_MEMORY"))Object.defineProperty(Module,"TOTAL_MEMORY",{configurable:true,get:function(){abort("Module.TOTAL_MEMORY has been replaced with plain INITIAL_TOTAL_MEMORY");}});assert(INITIAL_TOTAL_MEMORY>=TOTAL_STACK,"TOTAL_MEMORY should be larger than TOTAL_STACK, was "+INITIAL_TOTAL_MEMORY+"! (TOTAL_STACK="+TOTAL_STACK+")");assert(typeof Int32Array!=="undefined"&&typeof Float64Array!=="undefined"&&Int32Array.prototype.subarray!==undefined&&Int32Array.prototype.set!==undefined,"JS engine does not provide full typed array support");if(Module["wasmMemory"]){wasmMemory=Module["wasmMemory"];}else {wasmMemory=new WebAssembly.Memory({"initial":INITIAL_TOTAL_MEMORY/WASM_PAGE_SIZE});}if(wasmMemory){buffer=wasmMemory.buffer;}INITIAL_TOTAL_MEMORY=buffer.byteLength;assert(INITIAL_TOTAL_MEMORY%WASM_PAGE_SIZE===0);updateGlobalBufferAndViews(buffer);HEAP32[DYNAMICTOP_PTR>>2]=DYNAMIC_BASE;function writeStackCookie(){assert((STACK_MAX&3)==0);HEAPU32[(STACK_MAX>>2)-1]=34821223;HEAPU32[(STACK_MAX>>2)-2]=2310721022;HEAP32[0]=1668509029;}function checkStackCookie(){var cookie1=HEAPU32[(STACK_MAX>>2)-1];var cookie2=HEAPU32[(STACK_MAX>>2)-2];if(cookie1!=34821223||cookie2!=2310721022){abort("Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x"+cookie2.toString(16)+" "+cookie1.toString(16));}if(HEAP32[0]!==1668509029)abort("Runtime error: The application has corrupted its heap memory area (address zero)!");}function abortStackOverflow(allocSize){abort("Stack overflow! Attempted to allocate "+allocSize+" bytes on the stack, but stack has only "+(STACK_MAX-stackSave()+allocSize)+" bytes available!");}(function(){var h16=new Int16Array(1);var h8=new Int8Array(h16.buffer);h16[0]=25459;if(h8[0]!==115||h8[1]!==99)throw "Runtime error: expected the system to be little-endian!"})();function abortFnPtrError(ptr,sig){abort("Invalid function pointer "+ptr+" called with signature '"+sig+"'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this). Build with ASSERTIONS=2 for more info.");}function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback();continue}var func=callback.func;if(typeof func==="number"){if(callback.arg===undefined){Module["dynCall_v"](func);}else {Module["dynCall_vi"](func,callback.arg);}}else {func(callback.arg===undefined?null:callback.arg);}}}var __ATPRERUN__=[];var __ATINIT__=[];var __ATMAIN__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;var runtimeExited=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift());}}callRuntimeCallbacks(__ATPRERUN__);}function initRuntime(){checkStackCookie();assert(!runtimeInitialized);runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__);}function preMain(){checkStackCookie();callRuntimeCallbacks(__ATMAIN__);}function exitRuntime(){checkStackCookie();runtimeExited=true;}function postRun(){checkStackCookie();if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift());}}callRuntimeCallbacks(__ATPOSTRUN__);}function addOnPreRun(cb){__ATPRERUN__.unshift(cb);}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb);}assert(Math.imul,"This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");assert(Math.fround,"This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");assert(Math.clz32,"This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");assert(Math.trunc,"This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;var runDependencyTracking={};function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies);}if(id){assert(!runDependencyTracking[id]);runDependencyTracking[id]=1;if(runDependencyWatcher===null&&typeof setInterval!=="undefined"){runDependencyWatcher=setInterval(function(){if(ABORT){clearInterval(runDependencyWatcher);runDependencyWatcher=null;return}var shown=false;for(var dep in runDependencyTracking){if(!shown){shown=true;err("still waiting on run dependencies:");}err("dependency: "+dep);}if(shown){err("(end of list)");}},1e4);}}else {err("warning: run dependency added without ID");}}function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies);}if(id){assert(runDependencyTracking[id]);delete runDependencyTracking[id];}else {err("warning: run dependency removed without ID");}if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null;}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback();}}}Module["preloadedImages"]={};Module["preloadedAudios"]={};function abort(what){if(Module["onAbort"]){Module["onAbort"](what);}what+="";out(what);err(what);ABORT=true;var extra="";var output="abort("+what+") at "+stackTrace()+extra;throw output}var FS={error:function(){abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1");},init:function(){FS.error();},createDataFile:function(){FS.error();},createPreloadedFile:function(){FS.error();},createLazyFile:function(){FS.error();},open:function(){FS.error();},mkdev:function(){FS.error();},registerDevice:function(){FS.error();},analyzePath:function(){FS.error();},loadFilesFromDB:function(){FS.error();},ErrnoError:function ErrnoError(){FS.error();}};Module["FS_createDataFile"]=FS.createDataFile;Module["FS_createPreloadedFile"]=FS.createPreloadedFile;var dataURIPrefix="data:application/octet-stream;base64,";function isDataURI(filename){return String.prototype.startsWith?filename.startsWith(dataURIPrefix):filename.indexOf(dataURIPrefix)===0}var wasmBinaryFile="woff2.wasm";if(!isDataURI(wasmBinaryFile)){wasmBinaryFile=locateFile(wasmBinaryFile);}function getBinary(){try{if(wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(wasmBinaryFile)}else {throw "both async and sync fetching of the wasm failed"}}catch(err){abort(err);}}function getBinaryPromise(){if(!wasmBinary&&(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)&&typeof fetch==="function"){return fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){if(!response["ok"]){throw "failed to load wasm binary file at '"+wasmBinaryFile+"'"}return response["arrayBuffer"]()}).catch(function(){return getBinary()})}return new Promise(function(resolve,reject){resolve(getBinary());})}function createWasm(){var info={"env":asmLibraryArg,"wasi_unstable":asmLibraryArg,"global":{"NaN":NaN,Infinity:Infinity},"global.Math":Math,"asm2wasm":asm2wasmImports};function receiveInstance(instance,module){var exports=instance.exports;Module["asm"]=exports;removeRunDependency("wasm-instantiate");}addRunDependency("wasm-instantiate");var trueModule=Module;function receiveInstantiatedSource(output){assert(Module===trueModule,"the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");trueModule=null;receiveInstance(output["instance"]);}function instantiateArrayBuffer(receiver){return getBinaryPromise().then(function(binary){return WebAssembly.instantiate(binary,info)}).then(receiver,function(reason){err("failed to asynchronously prepare wasm: "+reason);abort(reason);})}function instantiateAsync(){if(!wasmBinary&&typeof WebAssembly.instantiateStreaming==="function"&&!isDataURI(wasmBinaryFile)&&typeof fetch==="function"){fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){var result=WebAssembly.instantiateStreaming(response,info);return result.then(receiveInstantiatedSource,function(reason){err("wasm streaming compile failed: "+reason);err("falling back to ArrayBuffer instantiation");instantiateArrayBuffer(receiveInstantiatedSource);})});}else {return instantiateArrayBuffer(receiveInstantiatedSource)}}if(Module["instantiateWasm"]){try{var exports=Module["instantiateWasm"](info,receiveInstance);return exports}catch(e){err("Module.instantiateWasm callback failed with error: "+e);return false}}instantiateAsync();return {}}Module["asm"]=createWasm;__ATINIT__.push({func:function(){globalCtors();}});var tempDoublePtr=434096;assert(tempDoublePtr%8==0);function demangle(func){var __cxa_demangle_func=Module["___cxa_demangle"]||Module["__cxa_demangle"];assert(__cxa_demangle_func);try{var s=func;if(s.startsWith("__Z"))s=s.substr(1);var len=lengthBytesUTF8(s)+1;var buf=_malloc(len);stringToUTF8(s,buf,len);var status=_malloc(4);var ret=__cxa_demangle_func(buf,0,0,status);if(HEAP32[status>>2]===0&&ret){return UTF8ToString(ret)}}catch(e){}finally{if(buf)_free(buf);if(status)_free(status);if(ret)_free(ret);}return func}function demangleAll(text){var regex=/\b__Z[\w\d_]+/g;return text.replace(regex,function(x){var y=demangle(x);return x===y?x:y+" ["+x+"]"})}function jsStackTrace(){var err=new Error;if(!err.stack){try{throw new Error(0)}catch(e){err=e;}if(!err.stack){return "(no stack trace available)"}}return err.stack.toString()}function stackTrace(){var js=jsStackTrace();if(Module["extraStackTrace"])js+="\n"+Module["extraStackTrace"]();return demangleAll(js)}function ___assert_fail(condition,filename,line,func){abort("Assertion failed: "+UTF8ToString(condition)+", at: "+[filename?UTF8ToString(filename):"unknown filename",line,func?UTF8ToString(func):"unknown function"]);}function ___cxa_allocate_exception(size){return _malloc(size)}var ___exception_infos={};function ___cxa_throw(ptr,type,destructor){___exception_infos[ptr]={ptr:ptr,adjusted:[ptr],type:type,destructor:destructor,refcount:0,caught:false,rethrown:false};if(!("uncaught_exception"in __ZSt18uncaught_exceptionv)){__ZSt18uncaught_exceptionv.uncaught_exceptions=1;}else {__ZSt18uncaught_exceptionv.uncaught_exceptions++;}throw ptr+" - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch."}function ___lock(){}function ___unlock(){}var SYSCALLS={buffers:[null,[],[]],printChar:function(stream,curr){var buffer=SYSCALLS.buffers[stream];assert(buffer);if(curr===0||curr===10){(stream===1?out:err)(UTF8ArrayToString(buffer,0));buffer.length=0;}else {buffer.push(curr);}},varargs:0,get:function(varargs){SYSCALLS.varargs+=4;var ret=HEAP32[SYSCALLS.varargs-4>>2];return ret},getStr:function(){var ret=UTF8ToString(SYSCALLS.get());return ret},get64:function(){var low=SYSCALLS.get(),high=SYSCALLS.get();if(low>=0)assert(high===0);else assert(high===-1);return low},getZero:function(){assert(SYSCALLS.get()===0);}};function _fd_close(fd){try{abort("it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM");return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return e.errno}}function ___wasi_fd_close(){return _fd_close.apply(null,arguments)}function _fd_seek(fd,offset_low,offset_high,whence,newOffset){try{abort("it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM");return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return e.errno}}function ___wasi_fd_seek(){return _fd_seek.apply(null,arguments)}function flush_NO_FILESYSTEM(){var fflush=Module["_fflush"];if(fflush)fflush(0);var buffers=SYSCALLS.buffers;if(buffers[1].length)SYSCALLS.printChar(1,10);if(buffers[2].length)SYSCALLS.printChar(2,10);}function _fd_write(fd,iov,iovcnt,pnum){try{var num=0;for(var i=0;i<iovcnt;i++){var ptr=HEAP32[iov+i*8>>2];var len=HEAP32[iov+(i*8+4)>>2];for(var j=0;j<len;j++){SYSCALLS.printChar(fd,HEAPU8[ptr+j]);}num+=len;}HEAP32[pnum>>2]=num;return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return e.errno}}function ___wasi_fd_write(){return _fd_write.apply(null,arguments)}function getShiftFromSize(size){switch(size){case 1:return 0;case 2:return 1;case 4:return 2;case 8:return 3;default:throw new TypeError("Unknown type size: "+size)}}function embind_init_charCodes(){var codes=new Array(256);for(var i=0;i<256;++i){codes[i]=String.fromCharCode(i);}embind_charCodes=codes;}var embind_charCodes=undefined;function readLatin1String(ptr){var ret="";var c=ptr;while(HEAPU8[c]){ret+=embind_charCodes[HEAPU8[c++]];}return ret}var awaitingDependencies={};var registeredTypes={};var typeDependencies={};var char_0=48;var char_9=57;function makeLegalFunctionName(name){if(undefined===name){return "_unknown"}name=name.replace(/[^a-zA-Z0-9_]/g,"$");var f=name.charCodeAt(0);if(f>=char_0&&f<=char_9){return "_"+name}else {return name}}function createNamedFunction(name,body){name=makeLegalFunctionName(name);return new Function("body","return function "+name+"() {\n"+'    "use strict";'+"    return body.apply(this, arguments);\n"+"};\n")(body)}function extendError(baseErrorType,errorName){var errorClass=createNamedFunction(errorName,function(message){this.name=errorName;this.message=message;var stack=new Error(message).stack;if(stack!==undefined){this.stack=this.toString()+"\n"+stack.replace(/^Error(:[^\n]*)?\n/,"");}});errorClass.prototype=Object.create(baseErrorType.prototype);errorClass.prototype.constructor=errorClass;errorClass.prototype.toString=function(){if(this.message===undefined){return this.name}else {return this.name+": "+this.message}};return errorClass}var BindingError=undefined;function throwBindingError(message){throw new BindingError(message)}var InternalError=undefined;function throwInternalError(message){throw new InternalError(message)}function whenDependentTypesAreResolved(myTypes,dependentTypes,getTypeConverters){myTypes.forEach(function(type){typeDependencies[type]=dependentTypes;});function onComplete(typeConverters){var myTypeConverters=getTypeConverters(typeConverters);if(myTypeConverters.length!==myTypes.length){throwInternalError("Mismatched type converter count");}for(var i=0;i<myTypes.length;++i){registerType(myTypes[i],myTypeConverters[i]);}}var typeConverters=new Array(dependentTypes.length);var unregisteredTypes=[];var registered=0;dependentTypes.forEach(function(dt,i){if(registeredTypes.hasOwnProperty(dt)){typeConverters[i]=registeredTypes[dt];}else {unregisteredTypes.push(dt);if(!awaitingDependencies.hasOwnProperty(dt)){awaitingDependencies[dt]=[];}awaitingDependencies[dt].push(function(){typeConverters[i]=registeredTypes[dt];++registered;if(registered===unregisteredTypes.length){onComplete(typeConverters);}});}});if(0===unregisteredTypes.length){onComplete(typeConverters);}}function registerType(rawType,registeredInstance,options){options=options||{};if(!("argPackAdvance"in registeredInstance)){throw new TypeError("registerType registeredInstance requires argPackAdvance")}var name=registeredInstance.name;if(!rawType){throwBindingError('type "'+name+'" must have a positive integer typeid pointer');}if(registeredTypes.hasOwnProperty(rawType)){if(options.ignoreDuplicateRegistrations){return}else {throwBindingError("Cannot register type '"+name+"' twice");}}registeredTypes[rawType]=registeredInstance;delete typeDependencies[rawType];if(awaitingDependencies.hasOwnProperty(rawType)){var callbacks=awaitingDependencies[rawType];delete awaitingDependencies[rawType];callbacks.forEach(function(cb){cb();});}}function __embind_register_bool(rawType,name,size,trueValue,falseValue){var shift=getShiftFromSize(size);name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(wt){return !!wt},"toWireType":function(destructors,o){return o?trueValue:falseValue},"argPackAdvance":8,"readValueFromPointer":function(pointer){var heap;if(size===1){heap=HEAP8;}else if(size===2){heap=HEAP16;}else if(size===4){heap=HEAP32;}else {throw new TypeError("Unknown boolean type size: "+name)}return this["fromWireType"](heap[pointer>>shift])},destructorFunction:null});}function ClassHandle_isAliasOf(other){if(!(this instanceof ClassHandle)){return false}if(!(other instanceof ClassHandle)){return false}var leftClass=this.$$.ptrType.registeredClass;var left=this.$$.ptr;var rightClass=other.$$.ptrType.registeredClass;var right=other.$$.ptr;while(leftClass.baseClass){left=leftClass.upcast(left);leftClass=leftClass.baseClass;}while(rightClass.baseClass){right=rightClass.upcast(right);rightClass=rightClass.baseClass;}return leftClass===rightClass&&left===right}function shallowCopyInternalPointer(o){return {count:o.count,deleteScheduled:o.deleteScheduled,preservePointerOnDelete:o.preservePointerOnDelete,ptr:o.ptr,ptrType:o.ptrType,smartPtr:o.smartPtr,smartPtrType:o.smartPtrType}}function throwInstanceAlreadyDeleted(obj){function getInstanceTypeName(handle){return handle.$$.ptrType.registeredClass.name}throwBindingError(getInstanceTypeName(obj)+" instance already deleted");}var finalizationGroup=false;function detachFinalizer(handle){}function runDestructor($$){if($$.smartPtr){$$.smartPtrType.rawDestructor($$.smartPtr);}else {$$.ptrType.registeredClass.rawDestructor($$.ptr);}}function releaseClassHandle($$){$$.count.value-=1;var toDelete=0===$$.count.value;if(toDelete){runDestructor($$);}}function attachFinalizer(handle){if("undefined"===typeof FinalizationGroup){attachFinalizer=function(handle){return handle};return handle}finalizationGroup=new FinalizationGroup(function(iter){for(var result=iter.next();!result.done;result=iter.next()){var $$=result.value;if(!$$.ptr){console.warn("object already deleted: "+$$.ptr);}else {releaseClassHandle($$);}}});attachFinalizer=function(handle){finalizationGroup.register(handle,handle.$$,handle.$$);return handle};detachFinalizer=function(handle){finalizationGroup.unregister(handle.$$);};return attachFinalizer(handle)}function ClassHandle_clone(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this);}if(this.$$.preservePointerOnDelete){this.$$.count.value+=1;return this}else {var clone=attachFinalizer(Object.create(Object.getPrototypeOf(this),{$$:{value:shallowCopyInternalPointer(this.$$)}}));clone.$$.count.value+=1;clone.$$.deleteScheduled=false;return clone}}function ClassHandle_delete(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this);}if(this.$$.deleteScheduled&&!this.$$.preservePointerOnDelete){throwBindingError("Object already scheduled for deletion");}detachFinalizer(this);releaseClassHandle(this.$$);if(!this.$$.preservePointerOnDelete){this.$$.smartPtr=undefined;this.$$.ptr=undefined;}}function ClassHandle_isDeleted(){return !this.$$.ptr}var delayFunction=undefined;var deletionQueue=[];function flushPendingDeletes(){while(deletionQueue.length){var obj=deletionQueue.pop();obj.$$.deleteScheduled=false;obj["delete"]();}}function ClassHandle_deleteLater(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this);}if(this.$$.deleteScheduled&&!this.$$.preservePointerOnDelete){throwBindingError("Object already scheduled for deletion");}deletionQueue.push(this);if(deletionQueue.length===1&&delayFunction){delayFunction(flushPendingDeletes);}this.$$.deleteScheduled=true;return this}function init_ClassHandle(){ClassHandle.prototype["isAliasOf"]=ClassHandle_isAliasOf;ClassHandle.prototype["clone"]=ClassHandle_clone;ClassHandle.prototype["delete"]=ClassHandle_delete;ClassHandle.prototype["isDeleted"]=ClassHandle_isDeleted;ClassHandle.prototype["deleteLater"]=ClassHandle_deleteLater;}function ClassHandle(){}var registeredPointers={};function ensureOverloadTable(proto,methodName,humanName){if(undefined===proto[methodName].overloadTable){var prevFunc=proto[methodName];proto[methodName]=function(){if(!proto[methodName].overloadTable.hasOwnProperty(arguments.length)){throwBindingError("Function '"+humanName+"' called with an invalid number of arguments ("+arguments.length+") - expects one of ("+proto[methodName].overloadTable+")!");}return proto[methodName].overloadTable[arguments.length].apply(this,arguments)};proto[methodName].overloadTable=[];proto[methodName].overloadTable[prevFunc.argCount]=prevFunc;}}function exposePublicSymbol(name,value,numArguments){if(Module.hasOwnProperty(name)){if(undefined===numArguments||undefined!==Module[name].overloadTable&&undefined!==Module[name].overloadTable[numArguments]){throwBindingError("Cannot register public name '"+name+"' twice");}ensureOverloadTable(Module,name,name);if(Module.hasOwnProperty(numArguments)){throwBindingError("Cannot register multiple overloads of a function with the same number of arguments ("+numArguments+")!");}Module[name].overloadTable[numArguments]=value;}else {Module[name]=value;if(undefined!==numArguments){Module[name].numArguments=numArguments;}}}function RegisteredClass(name,constructor,instancePrototype,rawDestructor,baseClass,getActualType,upcast,downcast){this.name=name;this.constructor=constructor;this.instancePrototype=instancePrototype;this.rawDestructor=rawDestructor;this.baseClass=baseClass;this.getActualType=getActualType;this.upcast=upcast;this.downcast=downcast;this.pureVirtualFunctions=[];}function upcastPointer(ptr,ptrClass,desiredClass){while(ptrClass!==desiredClass){if(!ptrClass.upcast){throwBindingError("Expected null or instance of "+desiredClass.name+", got an instance of "+ptrClass.name);}ptr=ptrClass.upcast(ptr);ptrClass=ptrClass.baseClass;}return ptr}function constNoSmartPtrRawPointerToWireType(destructors,handle){if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name);}return 0}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name);}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name);}var handleClass=handle.$$.ptrType.registeredClass;var ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);return ptr}function genericPointerToWireType(destructors,handle){var ptr;if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name);}if(this.isSmartPointer){ptr=this.rawConstructor();if(destructors!==null){destructors.push(this.rawDestructor,ptr);}return ptr}else {return 0}}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name);}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name);}if(!this.isConst&&handle.$$.ptrType.isConst){throwBindingError("Cannot convert argument of type "+(handle.$$.smartPtrType?handle.$$.smartPtrType.name:handle.$$.ptrType.name)+" to parameter type "+this.name);}var handleClass=handle.$$.ptrType.registeredClass;ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);if(this.isSmartPointer){if(undefined===handle.$$.smartPtr){throwBindingError("Passing raw pointer to smart pointer is illegal");}switch(this.sharingPolicy){case 0:if(handle.$$.smartPtrType===this){ptr=handle.$$.smartPtr;}else {throwBindingError("Cannot convert argument of type "+(handle.$$.smartPtrType?handle.$$.smartPtrType.name:handle.$$.ptrType.name)+" to parameter type "+this.name);}break;case 1:ptr=handle.$$.smartPtr;break;case 2:if(handle.$$.smartPtrType===this){ptr=handle.$$.smartPtr;}else {var clonedHandle=handle["clone"]();ptr=this.rawShare(ptr,__emval_register(function(){clonedHandle["delete"]();}));if(destructors!==null){destructors.push(this.rawDestructor,ptr);}}break;default:throwBindingError("Unsupporting sharing policy");}}return ptr}function nonConstNoSmartPtrRawPointerToWireType(destructors,handle){if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name);}return 0}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name);}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name);}if(handle.$$.ptrType.isConst){throwBindingError("Cannot convert argument of type "+handle.$$.ptrType.name+" to parameter type "+this.name);}var handleClass=handle.$$.ptrType.registeredClass;var ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);return ptr}function simpleReadValueFromPointer(pointer){return this["fromWireType"](HEAPU32[pointer>>2])}function RegisteredPointer_getPointee(ptr){if(this.rawGetPointee){ptr=this.rawGetPointee(ptr);}return ptr}function RegisteredPointer_destructor(ptr){if(this.rawDestructor){this.rawDestructor(ptr);}}function RegisteredPointer_deleteObject(handle){if(handle!==null){handle["delete"]();}}function downcastPointer(ptr,ptrClass,desiredClass){if(ptrClass===desiredClass){return ptr}if(undefined===desiredClass.baseClass){return null}var rv=downcastPointer(ptr,ptrClass,desiredClass.baseClass);if(rv===null){return null}return desiredClass.downcast(rv)}function getInheritedInstanceCount(){return Object.keys(registeredInstances).length}function getLiveInheritedInstances(){var rv=[];for(var k in registeredInstances){if(registeredInstances.hasOwnProperty(k)){rv.push(registeredInstances[k]);}}return rv}function setDelayFunction(fn){delayFunction=fn;if(deletionQueue.length&&delayFunction){delayFunction(flushPendingDeletes);}}function init_embind(){Module["getInheritedInstanceCount"]=getInheritedInstanceCount;Module["getLiveInheritedInstances"]=getLiveInheritedInstances;Module["flushPendingDeletes"]=flushPendingDeletes;Module["setDelayFunction"]=setDelayFunction;}var registeredInstances={};function getBasestPointer(class_,ptr){if(ptr===undefined){throwBindingError("ptr should not be undefined");}while(class_.baseClass){ptr=class_.upcast(ptr);class_=class_.baseClass;}return ptr}function getInheritedInstance(class_,ptr){ptr=getBasestPointer(class_,ptr);return registeredInstances[ptr]}function makeClassHandle(prototype,record){if(!record.ptrType||!record.ptr){throwInternalError("makeClassHandle requires ptr and ptrType");}var hasSmartPtrType=!!record.smartPtrType;var hasSmartPtr=!!record.smartPtr;if(hasSmartPtrType!==hasSmartPtr){throwInternalError("Both smartPtrType and smartPtr must be specified");}record.count={value:1};return attachFinalizer(Object.create(prototype,{$$:{value:record}}))}function RegisteredPointer_fromWireType(ptr){var rawPointer=this.getPointee(ptr);if(!rawPointer){this.destructor(ptr);return null}var registeredInstance=getInheritedInstance(this.registeredClass,rawPointer);if(undefined!==registeredInstance){if(0===registeredInstance.$$.count.value){registeredInstance.$$.ptr=rawPointer;registeredInstance.$$.smartPtr=ptr;return registeredInstance["clone"]()}else {var rv=registeredInstance["clone"]();this.destructor(ptr);return rv}}function makeDefaultHandle(){if(this.isSmartPointer){return makeClassHandle(this.registeredClass.instancePrototype,{ptrType:this.pointeeType,ptr:rawPointer,smartPtrType:this,smartPtr:ptr})}else {return makeClassHandle(this.registeredClass.instancePrototype,{ptrType:this,ptr:ptr})}}var actualType=this.registeredClass.getActualType(rawPointer);var registeredPointerRecord=registeredPointers[actualType];if(!registeredPointerRecord){return makeDefaultHandle.call(this)}var toType;if(this.isConst){toType=registeredPointerRecord.constPointerType;}else {toType=registeredPointerRecord.pointerType;}var dp=downcastPointer(rawPointer,this.registeredClass,toType.registeredClass);if(dp===null){return makeDefaultHandle.call(this)}if(this.isSmartPointer){return makeClassHandle(toType.registeredClass.instancePrototype,{ptrType:toType,ptr:dp,smartPtrType:this,smartPtr:ptr})}else {return makeClassHandle(toType.registeredClass.instancePrototype,{ptrType:toType,ptr:dp})}}function init_RegisteredPointer(){RegisteredPointer.prototype.getPointee=RegisteredPointer_getPointee;RegisteredPointer.prototype.destructor=RegisteredPointer_destructor;RegisteredPointer.prototype["argPackAdvance"]=8;RegisteredPointer.prototype["readValueFromPointer"]=simpleReadValueFromPointer;RegisteredPointer.prototype["deleteObject"]=RegisteredPointer_deleteObject;RegisteredPointer.prototype["fromWireType"]=RegisteredPointer_fromWireType;}function RegisteredPointer(name,registeredClass,isReference,isConst,isSmartPointer,pointeeType,sharingPolicy,rawGetPointee,rawConstructor,rawShare,rawDestructor){this.name=name;this.registeredClass=registeredClass;this.isReference=isReference;this.isConst=isConst;this.isSmartPointer=isSmartPointer;this.pointeeType=pointeeType;this.sharingPolicy=sharingPolicy;this.rawGetPointee=rawGetPointee;this.rawConstructor=rawConstructor;this.rawShare=rawShare;this.rawDestructor=rawDestructor;if(!isSmartPointer&&registeredClass.baseClass===undefined){if(isConst){this["toWireType"]=constNoSmartPtrRawPointerToWireType;this.destructorFunction=null;}else {this["toWireType"]=nonConstNoSmartPtrRawPointerToWireType;this.destructorFunction=null;}}else {this["toWireType"]=genericPointerToWireType;}}function replacePublicSymbol(name,value,numArguments){if(!Module.hasOwnProperty(name)){throwInternalError("Replacing nonexistant public symbol");}if(undefined!==Module[name].overloadTable&&undefined!==numArguments){Module[name].overloadTable[numArguments]=value;}else {Module[name]=value;Module[name].argCount=numArguments;}}function embind__requireFunction(signature,rawFunction){signature=readLatin1String(signature);function makeDynCaller(dynCall){var args=[];for(var i=1;i<signature.length;++i){args.push("a"+i);}var name="dynCall_"+signature+"_"+rawFunction;var body="return function "+name+"("+args.join(", ")+") {\n";body+="    return dynCall(rawFunction"+(args.length?", ":"")+args.join(", ")+");\n";body+="};\n";return new Function("dynCall","rawFunction",body)(dynCall,rawFunction)}var fp;if(Module["FUNCTION_TABLE_"+signature]!==undefined){fp=Module["FUNCTION_TABLE_"+signature][rawFunction];}else if(typeof FUNCTION_TABLE!=="undefined"){fp=FUNCTION_TABLE[rawFunction];}else {var dc=Module["dynCall_"+signature];if(dc===undefined){dc=Module["dynCall_"+signature.replace(/f/g,"d")];if(dc===undefined){throwBindingError("No dynCall invoker for signature: "+signature);}}fp=makeDynCaller(dc);}if(typeof fp!=="function"){throwBindingError("unknown function pointer with signature "+signature+": "+rawFunction);}return fp}var UnboundTypeError=undefined;function getTypeName(type){var ptr=___getTypeName(type);var rv=readLatin1String(ptr);_free(ptr);return rv}function throwUnboundTypeError(message,types){var unboundTypes=[];var seen={};function visit(type){if(seen[type]){return}if(registeredTypes[type]){return}if(typeDependencies[type]){typeDependencies[type].forEach(visit);return}unboundTypes.push(type);seen[type]=true;}types.forEach(visit);throw new UnboundTypeError(message+": "+unboundTypes.map(getTypeName).join([", "]))}function __embind_register_class(rawType,rawPointerType,rawConstPointerType,baseClassRawType,getActualTypeSignature,getActualType,upcastSignature,upcast,downcastSignature,downcast,name,destructorSignature,rawDestructor){name=readLatin1String(name);getActualType=embind__requireFunction(getActualTypeSignature,getActualType);if(upcast){upcast=embind__requireFunction(upcastSignature,upcast);}if(downcast){downcast=embind__requireFunction(downcastSignature,downcast);}rawDestructor=embind__requireFunction(destructorSignature,rawDestructor);var legalFunctionName=makeLegalFunctionName(name);exposePublicSymbol(legalFunctionName,function(){throwUnboundTypeError("Cannot construct "+name+" due to unbound types",[baseClassRawType]);});whenDependentTypesAreResolved([rawType,rawPointerType,rawConstPointerType],baseClassRawType?[baseClassRawType]:[],function(base){base=base[0];var baseClass;var basePrototype;if(baseClassRawType){baseClass=base.registeredClass;basePrototype=baseClass.instancePrototype;}else {basePrototype=ClassHandle.prototype;}var constructor=createNamedFunction(legalFunctionName,function(){if(Object.getPrototypeOf(this)!==instancePrototype){throw new BindingError("Use 'new' to construct "+name)}if(undefined===registeredClass.constructor_body){throw new BindingError(name+" has no accessible constructor")}var body=registeredClass.constructor_body[arguments.length];if(undefined===body){throw new BindingError("Tried to invoke ctor of "+name+" with invalid number of parameters ("+arguments.length+") - expected ("+Object.keys(registeredClass.constructor_body).toString()+") parameters instead!")}return body.apply(this,arguments)});var instancePrototype=Object.create(basePrototype,{constructor:{value:constructor}});constructor.prototype=instancePrototype;var registeredClass=new RegisteredClass(name,constructor,instancePrototype,rawDestructor,baseClass,getActualType,upcast,downcast);var referenceConverter=new RegisteredPointer(name,registeredClass,true,false,false);var pointerConverter=new RegisteredPointer(name+"*",registeredClass,false,false,false);var constPointerConverter=new RegisteredPointer(name+" const*",registeredClass,false,true,false);registeredPointers[rawType]={pointerType:pointerConverter,constPointerType:constPointerConverter};replacePublicSymbol(legalFunctionName,constructor);return [referenceConverter,pointerConverter,constPointerConverter]});}function heap32VectorToArray(count,firstElement){var array=[];for(var i=0;i<count;i++){array.push(HEAP32[(firstElement>>2)+i]);}return array}function runDestructors(destructors){while(destructors.length){var ptr=destructors.pop();var del=destructors.pop();del(ptr);}}function __embind_register_class_constructor(rawClassType,argCount,rawArgTypesAddr,invokerSignature,invoker,rawConstructor){var rawArgTypes=heap32VectorToArray(argCount,rawArgTypesAddr);invoker=embind__requireFunction(invokerSignature,invoker);whenDependentTypesAreResolved([],[rawClassType],function(classType){classType=classType[0];var humanName="constructor "+classType.name;if(undefined===classType.registeredClass.constructor_body){classType.registeredClass.constructor_body=[];}if(undefined!==classType.registeredClass.constructor_body[argCount-1]){throw new BindingError("Cannot register multiple constructors with identical number of parameters ("+(argCount-1)+") for class '"+classType.name+"'! Overload resolution is currently only performed using the parameter count, not actual type info!")}classType.registeredClass.constructor_body[argCount-1]=function unboundTypeHandler(){throwUnboundTypeError("Cannot construct "+classType.name+" due to unbound types",rawArgTypes);};whenDependentTypesAreResolved([],rawArgTypes,function(argTypes){classType.registeredClass.constructor_body[argCount-1]=function constructor_body(){if(arguments.length!==argCount-1){throwBindingError(humanName+" called with "+arguments.length+" arguments, expected "+(argCount-1));}var destructors=[];var args=new Array(argCount);args[0]=rawConstructor;for(var i=1;i<argCount;++i){args[i]=argTypes[i]["toWireType"](destructors,arguments[i-1]);}var ptr=invoker.apply(null,args);runDestructors(destructors);return argTypes[0]["fromWireType"](ptr)};return []});return []});}function new_(constructor,argumentList){if(!(constructor instanceof Function)){throw new TypeError("new_ called with constructor type "+typeof constructor+" which is not a function")}var dummy=createNamedFunction(constructor.name||"unknownFunctionName",function(){});dummy.prototype=constructor.prototype;var obj=new dummy;var r=constructor.apply(obj,argumentList);return r instanceof Object?r:obj}function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc){var argCount=argTypes.length;if(argCount<2){throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");}var isClassMethodFunc=argTypes[1]!==null&&classType!==null;var needsDestructorStack=false;for(var i=1;i<argTypes.length;++i){if(argTypes[i]!==null&&argTypes[i].destructorFunction===undefined){needsDestructorStack=true;break}}var returns=argTypes[0].name!=="void";var argsList="";var argsListWired="";for(var i=0;i<argCount-2;++i){argsList+=(i!==0?", ":"")+"arg"+i;argsListWired+=(i!==0?", ":"")+"arg"+i+"Wired";}var invokerFnBody="return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n"+"if (arguments.length !== "+(argCount-2)+") {\n"+"throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount-2)+" args!');\n"+"}\n";if(needsDestructorStack){invokerFnBody+="var destructors = [];\n";}var dtorStack=needsDestructorStack?"destructors":"null";var args1=["throwBindingError","invoker","fn","runDestructors","retType","classParam"];var args2=[throwBindingError,cppInvokerFunc,cppTargetFunc,runDestructors,argTypes[0],argTypes[1]];if(isClassMethodFunc){invokerFnBody+="var thisWired = classParam.toWireType("+dtorStack+", this);\n";}for(var i=0;i<argCount-2;++i){invokerFnBody+="var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";args1.push("argType"+i);args2.push(argTypes[i+2]);}if(isClassMethodFunc){argsListWired="thisWired"+(argsListWired.length>0?", ":"")+argsListWired;}invokerFnBody+=(returns?"var rv = ":"")+"invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";if(needsDestructorStack){invokerFnBody+="runDestructors(destructors);\n";}else {for(var i=isClassMethodFunc?1:2;i<argTypes.length;++i){var paramName=i===1?"thisWired":"arg"+(i-2)+"Wired";if(argTypes[i].destructorFunction!==null){invokerFnBody+=paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";args1.push(paramName+"_dtor");args2.push(argTypes[i].destructorFunction);}}}if(returns){invokerFnBody+="var ret = retType.fromWireType(rv);\n"+"return ret;\n";}invokerFnBody+="}\n";args1.push(invokerFnBody);var invokerFunction=new_(Function,args1).apply(null,args2);return invokerFunction}function __embind_register_class_function(rawClassType,methodName,argCount,rawArgTypesAddr,invokerSignature,rawInvoker,context,isPureVirtual){var rawArgTypes=heap32VectorToArray(argCount,rawArgTypesAddr);methodName=readLatin1String(methodName);rawInvoker=embind__requireFunction(invokerSignature,rawInvoker);whenDependentTypesAreResolved([],[rawClassType],function(classType){classType=classType[0];var humanName=classType.name+"."+methodName;if(isPureVirtual){classType.registeredClass.pureVirtualFunctions.push(methodName);}function unboundTypesHandler(){throwUnboundTypeError("Cannot call "+humanName+" due to unbound types",rawArgTypes);}var proto=classType.registeredClass.instancePrototype;var method=proto[methodName];if(undefined===method||undefined===method.overloadTable&&method.className!==classType.name&&method.argCount===argCount-2){unboundTypesHandler.argCount=argCount-2;unboundTypesHandler.className=classType.name;proto[methodName]=unboundTypesHandler;}else {ensureOverloadTable(proto,methodName,humanName);proto[methodName].overloadTable[argCount-2]=unboundTypesHandler;}whenDependentTypesAreResolved([],rawArgTypes,function(argTypes){var memberFunction=craftInvokerFunction(humanName,argTypes,classType,rawInvoker,context);if(undefined===proto[methodName].overloadTable){memberFunction.argCount=argCount-2;proto[methodName]=memberFunction;}else {proto[methodName].overloadTable[argCount-2]=memberFunction;}return []});return []});}var emval_free_list=[];var emval_handle_array=[{},{value:undefined},{value:null},{value:true},{value:false}];function __emval_decref(handle){if(handle>4&&0===--emval_handle_array[handle].refcount){emval_handle_array[handle]=undefined;emval_free_list.push(handle);}}function count_emval_handles(){var count=0;for(var i=5;i<emval_handle_array.length;++i){if(emval_handle_array[i]!==undefined){++count;}}return count}function get_first_emval(){for(var i=5;i<emval_handle_array.length;++i){if(emval_handle_array[i]!==undefined){return emval_handle_array[i]}}return null}function init_emval(){Module["count_emval_handles"]=count_emval_handles;Module["get_first_emval"]=get_first_emval;}function __emval_register(value){switch(value){case undefined:{return 1}case null:{return 2}case true:{return 3}case false:{return 4}default:{var handle=emval_free_list.length?emval_free_list.pop():emval_handle_array.length;emval_handle_array[handle]={refcount:1,value:value};return handle}}}function __embind_register_emval(rawType,name){name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(handle){var rv=emval_handle_array[handle].value;__emval_decref(handle);return rv},"toWireType":function(destructors,value){return __emval_register(value)},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:null});}function _embind_repr(v){if(v===null){return "null"}var t=typeof v;if(t==="object"||t==="array"||t==="function"){return v.toString()}else {return ""+v}}function floatReadValueFromPointer(name,shift){switch(shift){case 2:return function(pointer){return this["fromWireType"](HEAPF32[pointer>>2])};case 3:return function(pointer){return this["fromWireType"](HEAPF64[pointer>>3])};default:throw new TypeError("Unknown float type: "+name)}}function __embind_register_float(rawType,name,size){var shift=getShiftFromSize(size);name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(value){return value},"toWireType":function(destructors,value){if(typeof value!=="number"&&typeof value!=="boolean"){throw new TypeError('Cannot convert "'+_embind_repr(value)+'" to '+this.name)}return value},"argPackAdvance":8,"readValueFromPointer":floatReadValueFromPointer(name,shift),destructorFunction:null});}function __embind_register_function(name,argCount,rawArgTypesAddr,signature,rawInvoker,fn){var argTypes=heap32VectorToArray(argCount,rawArgTypesAddr);name=readLatin1String(name);rawInvoker=embind__requireFunction(signature,rawInvoker);exposePublicSymbol(name,function(){throwUnboundTypeError("Cannot call "+name+" due to unbound types",argTypes);},argCount-1);whenDependentTypesAreResolved([],argTypes,function(argTypes){var invokerArgsArray=[argTypes[0],null].concat(argTypes.slice(1));replacePublicSymbol(name,craftInvokerFunction(name,invokerArgsArray,null,rawInvoker,fn),argCount-1);return []});}function integerReadValueFromPointer(name,shift,signed){switch(shift){case 0:return signed?function readS8FromPointer(pointer){return HEAP8[pointer]}:function readU8FromPointer(pointer){return HEAPU8[pointer]};case 1:return signed?function readS16FromPointer(pointer){return HEAP16[pointer>>1]}:function readU16FromPointer(pointer){return HEAPU16[pointer>>1]};case 2:return signed?function readS32FromPointer(pointer){return HEAP32[pointer>>2]}:function readU32FromPointer(pointer){return HEAPU32[pointer>>2]};default:throw new TypeError("Unknown integer type: "+name)}}function __embind_register_integer(primitiveType,name,size,minRange,maxRange){name=readLatin1String(name);if(maxRange===-1){maxRange=4294967295;}var shift=getShiftFromSize(size);var fromWireType=function(value){return value};if(minRange===0){var bitshift=32-8*size;fromWireType=function(value){return value<<bitshift>>>bitshift};}var isUnsignedType=name.indexOf("unsigned")!=-1;registerType(primitiveType,{name:name,"fromWireType":fromWireType,"toWireType":function(destructors,value){if(typeof value!=="number"&&typeof value!=="boolean"){throw new TypeError('Cannot convert "'+_embind_repr(value)+'" to '+this.name)}if(value<minRange||value>maxRange){throw new TypeError('Passing a number "'+_embind_repr(value)+'" from JS side to C/C++ side to an argument of type "'+name+'", which is outside the valid range ['+minRange+", "+maxRange+"]!")}return isUnsignedType?value>>>0:value|0},"argPackAdvance":8,"readValueFromPointer":integerReadValueFromPointer(name,shift,minRange!==0),destructorFunction:null});}function __embind_register_memory_view(rawType,dataTypeIndex,name){var typeMapping=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array];var TA=typeMapping[dataTypeIndex];function decodeMemoryView(handle){handle=handle>>2;var heap=HEAPU32;var size=heap[handle];var data=heap[handle+1];return new TA(heap["buffer"],data,size)}name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":decodeMemoryView,"argPackAdvance":8,"readValueFromPointer":decodeMemoryView},{ignoreDuplicateRegistrations:true});}function __embind_register_std_string(rawType,name){name=readLatin1String(name);var stdStringIsUTF8=name==="std::string";registerType(rawType,{name:name,"fromWireType":function(value){var length=HEAPU32[value>>2];var str;if(stdStringIsUTF8){var endChar=HEAPU8[value+4+length];var endCharSwap=0;if(endChar!=0){endCharSwap=endChar;HEAPU8[value+4+length]=0;}var decodeStartPtr=value+4;for(var i=0;i<=length;++i){var currentBytePtr=value+4+i;if(HEAPU8[currentBytePtr]==0){var stringSegment=UTF8ToString(decodeStartPtr);if(str===undefined)str=stringSegment;else {str+=String.fromCharCode(0);str+=stringSegment;}decodeStartPtr=currentBytePtr+1;}}if(endCharSwap!=0)HEAPU8[value+4+length]=endCharSwap;}else {var a=new Array(length);for(var i=0;i<length;++i){a[i]=String.fromCharCode(HEAPU8[value+4+i]);}str=a.join("");}_free(value);return str},"toWireType":function(destructors,value){if(value instanceof ArrayBuffer){value=new Uint8Array(value);}var getLength;var valueIsOfTypeString=typeof value==="string";if(!(valueIsOfTypeString||value instanceof Uint8Array||value instanceof Uint8ClampedArray||value instanceof Int8Array)){throwBindingError("Cannot pass non-string to std::string");}if(stdStringIsUTF8&&valueIsOfTypeString){getLength=function(){return lengthBytesUTF8(value)};}else {getLength=function(){return value.length};}var length=getLength();var ptr=_malloc(4+length+1);HEAPU32[ptr>>2]=length;if(stdStringIsUTF8&&valueIsOfTypeString){stringToUTF8(value,ptr+4,length+1);}else {if(valueIsOfTypeString){for(var i=0;i<length;++i){var charCode=value.charCodeAt(i);if(charCode>255){_free(ptr);throwBindingError("String has UTF-16 code units that do not fit in 8 bits");}HEAPU8[ptr+4+i]=charCode;}}else {for(var i=0;i<length;++i){HEAPU8[ptr+4+i]=value[i];}}}if(destructors!==null){destructors.push(_free,ptr);}return ptr},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:function(ptr){_free(ptr);}});}function __embind_register_std_wstring(rawType,charSize,name){name=readLatin1String(name);var getHeap,shift;if(charSize===2){getHeap=function(){return HEAPU16};shift=1;}else if(charSize===4){getHeap=function(){return HEAPU32};shift=2;}registerType(rawType,{name:name,"fromWireType":function(value){var HEAP=getHeap();var length=HEAPU32[value>>2];var a=new Array(length);var start=value+4>>shift;for(var i=0;i<length;++i){a[i]=String.fromCharCode(HEAP[start+i]);}_free(value);return a.join("")},"toWireType":function(destructors,value){var length=value.length;var ptr=_malloc(4+length*charSize);var HEAP=getHeap();HEAPU32[ptr>>2]=length;var start=ptr+4>>shift;for(var i=0;i<length;++i){HEAP[start+i]=value.charCodeAt(i);}if(destructors!==null){destructors.push(_free,ptr);}return ptr},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:function(ptr){_free(ptr);}});}function __embind_register_void(rawType,name){name=readLatin1String(name);registerType(rawType,{isVoid:true,name:name,"argPackAdvance":0,"fromWireType":function(){return undefined},"toWireType":function(destructors,o){return undefined}});}function __emval_incref(handle){if(handle>4){emval_handle_array[handle].refcount+=1;}}function requireRegisteredType(rawType,humanName){var impl=registeredTypes[rawType];if(undefined===impl){throwBindingError(humanName+" has unknown type "+getTypeName(rawType));}return impl}function __emval_take_value(type,argv){type=requireRegisteredType(type,"_emval_take_value");var v=type["readValueFromPointer"](argv);return __emval_register(v)}function _abort(){abort();}function _emscripten_get_heap_size(){return HEAP8.length}function emscripten_realloc_buffer(size){try{wasmMemory.grow(size-buffer.byteLength+65535>>16);updateGlobalBufferAndViews(wasmMemory.buffer);return 1}catch(e){console.error("emscripten_realloc_buffer: Attempted to grow heap from "+buffer.byteLength+" bytes to "+size+" bytes, but got error: "+e);}}function _emscripten_resize_heap(requestedSize){var oldSize=_emscripten_get_heap_size();assert(requestedSize>oldSize);var PAGE_MULTIPLE=65536;var LIMIT=2147483648-PAGE_MULTIPLE;if(requestedSize>LIMIT){err("Cannot enlarge memory, asked to go up to "+requestedSize+" bytes, but the limit is "+LIMIT+" bytes!");return false}var MIN_TOTAL_MEMORY=16777216;var newSize=Math.max(oldSize,MIN_TOTAL_MEMORY);while(newSize<requestedSize){if(newSize<=536870912){newSize=alignUp(2*newSize,PAGE_MULTIPLE);}else {newSize=Math.min(alignUp((3*newSize+2147483648)/4,PAGE_MULTIPLE),LIMIT);}if(newSize===oldSize){warnOnce("Cannot ask for more memory since we reached the practical limit in browsers (which is just below 2GB), so the request would have failed. Requesting only "+HEAP8.length);}}var replacement=emscripten_realloc_buffer(newSize);if(!replacement){err("Failed to grow the heap from "+oldSize+" bytes to "+newSize+" bytes, not enough memory!");return false}return true}function _exit(status){exit(status);}function _llvm_log2_f32(x){return Math.log(x)/Math.LN2}function _llvm_log2_f64(a0){return _llvm_log2_f32(a0)}function _llvm_trap(){abort("trap!");}function _emscripten_memcpy_big(dest,src,num){HEAPU8.set(HEAPU8.subarray(src,src+num),dest);}embind_init_charCodes();BindingError=Module["BindingError"]=extendError(Error,"BindingError");InternalError=Module["InternalError"]=extendError(Error,"InternalError");init_ClassHandle();init_RegisteredPointer();init_embind();UnboundTypeError=Module["UnboundTypeError"]=extendError(Error,"UnboundTypeError");init_emval();function nullFunc_i(x){abortFnPtrError(x,"i");}function nullFunc_ii(x){abortFnPtrError(x,"ii");}function nullFunc_iidiiii(x){abortFnPtrError(x,"iidiiii");}function nullFunc_iii(x){abortFnPtrError(x,"iii");}function nullFunc_iiii(x){abortFnPtrError(x,"iiii");}function nullFunc_iiiii(x){abortFnPtrError(x,"iiiii");}function nullFunc_jiji(x){abortFnPtrError(x,"jiji");}function nullFunc_v(x){abortFnPtrError(x,"v");}function nullFunc_vi(x){abortFnPtrError(x,"vi");}function nullFunc_vii(x){abortFnPtrError(x,"vii");}function nullFunc_viii(x){abortFnPtrError(x,"viii");}function nullFunc_viiii(x){abortFnPtrError(x,"viiii");}function nullFunc_viiiii(x){abortFnPtrError(x,"viiiii");}function nullFunc_viiiiii(x){abortFnPtrError(x,"viiiiii");}var asmGlobalArg={};var asmLibraryArg={"___assert_fail":___assert_fail,"___cxa_allocate_exception":___cxa_allocate_exception,"___cxa_throw":___cxa_throw,"___lock":___lock,"___unlock":___unlock,"___wasi_fd_close":___wasi_fd_close,"___wasi_fd_seek":___wasi_fd_seek,"___wasi_fd_write":___wasi_fd_write,"__embind_register_bool":__embind_register_bool,"__embind_register_class":__embind_register_class,"__embind_register_class_constructor":__embind_register_class_constructor,"__embind_register_class_function":__embind_register_class_function,"__embind_register_emval":__embind_register_emval,"__embind_register_float":__embind_register_float,"__embind_register_function":__embind_register_function,"__embind_register_integer":__embind_register_integer,"__embind_register_memory_view":__embind_register_memory_view,"__embind_register_std_string":__embind_register_std_string,"__embind_register_std_wstring":__embind_register_std_wstring,"__embind_register_void":__embind_register_void,"__emval_decref":__emval_decref,"__emval_incref":__emval_incref,"__emval_take_value":__emval_take_value,"__memory_base":1024,"__table_base":0,"_abort":_abort,"_emscripten_get_heap_size":_emscripten_get_heap_size,"_emscripten_memcpy_big":_emscripten_memcpy_big,"_emscripten_resize_heap":_emscripten_resize_heap,"_exit":_exit,"_llvm_log2_f64":_llvm_log2_f64,"_llvm_trap":_llvm_trap,"abortStackOverflow":abortStackOverflow,"memory":wasmMemory,"nullFunc_i":nullFunc_i,"nullFunc_ii":nullFunc_ii,"nullFunc_iidiiii":nullFunc_iidiiii,"nullFunc_iii":nullFunc_iii,"nullFunc_iiii":nullFunc_iiii,"nullFunc_iiiii":nullFunc_iiiii,"nullFunc_jiji":nullFunc_jiji,"nullFunc_v":nullFunc_v,"nullFunc_vi":nullFunc_vi,"nullFunc_vii":nullFunc_vii,"nullFunc_viii":nullFunc_viii,"nullFunc_viiii":nullFunc_viiii,"nullFunc_viiiii":nullFunc_viiiii,"nullFunc_viiiiii":nullFunc_viiiiii,"setTempRet0":setTempRet0,"table":wasmTable};var asm=Module["asm"](asmGlobalArg,asmLibraryArg,buffer);Module["asm"]=asm;var __ZSt18uncaught_exceptionv=Module["__ZSt18uncaught_exceptionv"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["__ZSt18uncaught_exceptionv"].apply(null,arguments)};Module["___cxa_demangle"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["___cxa_demangle"].apply(null,arguments)};Module["___embind_register_native_and_builtin_types"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["___embind_register_native_and_builtin_types"].apply(null,arguments)};var ___getTypeName=Module["___getTypeName"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["___getTypeName"].apply(null,arguments)};Module["_fflush"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["_fflush"].apply(null,arguments)};var _free=Module["_free"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["_free"].apply(null,arguments)};var _malloc=Module["_malloc"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["_malloc"].apply(null,arguments)};Module["establishStackSpace"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["establishStackSpace"].apply(null,arguments)};var globalCtors=Module["globalCtors"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["globalCtors"].apply(null,arguments)};var stackAlloc=Module["stackAlloc"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["stackAlloc"].apply(null,arguments)};var stackRestore=Module["stackRestore"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["stackRestore"].apply(null,arguments)};var stackSave=Module["stackSave"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["stackSave"].apply(null,arguments)};Module["dynCall_i"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_i"].apply(null,arguments)};Module["dynCall_ii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_ii"].apply(null,arguments)};Module["dynCall_iidiiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_iidiiii"].apply(null,arguments)};Module["dynCall_iii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_iii"].apply(null,arguments)};Module["dynCall_iiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_iiii"].apply(null,arguments)};Module["dynCall_iiiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_iiiii"].apply(null,arguments)};Module["dynCall_jiji"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_jiji"].apply(null,arguments)};Module["dynCall_v"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_v"].apply(null,arguments)};Module["dynCall_vi"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_vi"].apply(null,arguments)};Module["dynCall_vii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_vii"].apply(null,arguments)};Module["dynCall_viii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_viii"].apply(null,arguments)};Module["dynCall_viiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_viiii"].apply(null,arguments)};Module["dynCall_viiiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_viiiii"].apply(null,arguments)};Module["dynCall_viiiiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_viiiiii"].apply(null,arguments)};Module["asm"]=asm;if(!Object.getOwnPropertyDescriptor(Module,"intArrayFromString"))Module["intArrayFromString"]=function(){abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"intArrayToString"))Module["intArrayToString"]=function(){abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};Module["ccall"]=ccall;Module["cwrap"]=cwrap;if(!Object.getOwnPropertyDescriptor(Module,"setValue"))Module["setValue"]=function(){abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"getValue"))Module["getValue"]=function(){abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"allocate"))Module["allocate"]=function(){abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"getMemory"))Module["getMemory"]=function(){abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"AsciiToString"))Module["AsciiToString"]=function(){abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"stringToAscii"))Module["stringToAscii"]=function(){abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"UTF8ArrayToString"))Module["UTF8ArrayToString"]=function(){abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"UTF8ToString"))Module["UTF8ToString"]=function(){abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"stringToUTF8Array"))Module["stringToUTF8Array"]=function(){abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};Module["stringToUTF8"]=stringToUTF8;if(!Object.getOwnPropertyDescriptor(Module,"lengthBytesUTF8"))Module["lengthBytesUTF8"]=function(){abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"UTF16ToString"))Module["UTF16ToString"]=function(){abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"stringToUTF16"))Module["stringToUTF16"]=function(){abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"lengthBytesUTF16"))Module["lengthBytesUTF16"]=function(){abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"UTF32ToString"))Module["UTF32ToString"]=function(){abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"stringToUTF32"))Module["stringToUTF32"]=function(){abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"lengthBytesUTF32"))Module["lengthBytesUTF32"]=function(){abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"allocateUTF8"))Module["allocateUTF8"]=function(){abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"stackTrace"))Module["stackTrace"]=function(){abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"addOnPreRun"))Module["addOnPreRun"]=function(){abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"addOnInit"))Module["addOnInit"]=function(){abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"addOnPreMain"))Module["addOnPreMain"]=function(){abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"addOnExit"))Module["addOnExit"]=function(){abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"addOnPostRun"))Module["addOnPostRun"]=function(){abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"writeStringToMemory"))Module["writeStringToMemory"]=function(){abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"writeArrayToMemory"))Module["writeArrayToMemory"]=function(){abort("'writeArrayToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"writeAsciiToMemory"))Module["writeAsciiToMemory"]=function(){abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"addRunDependency"))Module["addRunDependency"]=function(){abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"removeRunDependency"))Module["removeRunDependency"]=function(){abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"ENV"))Module["ENV"]=function(){abort("'ENV' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"FS"))Module["FS"]=function(){abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"FS_createFolder"))Module["FS_createFolder"]=function(){abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"FS_createPath"))Module["FS_createPath"]=function(){abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"FS_createDataFile"))Module["FS_createDataFile"]=function(){abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"FS_createPreloadedFile"))Module["FS_createPreloadedFile"]=function(){abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"FS_createLazyFile"))Module["FS_createLazyFile"]=function(){abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"FS_createLink"))Module["FS_createLink"]=function(){abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"FS_createDevice"))Module["FS_createDevice"]=function(){abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"FS_unlink"))Module["FS_unlink"]=function(){abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");};if(!Object.getOwnPropertyDescriptor(Module,"GL"))Module["GL"]=function(){abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"dynamicAlloc"))Module["dynamicAlloc"]=function(){abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"loadDynamicLibrary"))Module["loadDynamicLibrary"]=function(){abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"loadWebAssemblyModule"))Module["loadWebAssemblyModule"]=function(){abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"getLEB"))Module["getLEB"]=function(){abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"getFunctionTables"))Module["getFunctionTables"]=function(){abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"alignFunctionTables"))Module["alignFunctionTables"]=function(){abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"registerFunctions"))Module["registerFunctions"]=function(){abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"addFunction"))Module["addFunction"]=function(){abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"removeFunction"))Module["removeFunction"]=function(){abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"getFuncWrapper"))Module["getFuncWrapper"]=function(){abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"prettyPrint"))Module["prettyPrint"]=function(){abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"makeBigInt"))Module["makeBigInt"]=function(){abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"dynCall"))Module["dynCall"]=function(){abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"getCompilerSetting"))Module["getCompilerSetting"]=function(){abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"stackSave"))Module["stackSave"]=function(){abort("'stackSave' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"stackRestore"))Module["stackRestore"]=function(){abort("'stackRestore' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"stackAlloc"))Module["stackAlloc"]=function(){abort("'stackAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"establishStackSpace"))Module["establishStackSpace"]=function(){abort("'establishStackSpace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"print"))Module["print"]=function(){abort("'print' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"printErr"))Module["printErr"]=function(){abort("'printErr' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"getTempRet0"))Module["getTempRet0"]=function(){abort("'getTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"setTempRet0"))Module["setTempRet0"]=function(){abort("'setTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"callMain"))Module["callMain"]=function(){abort("'callMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"abort"))Module["abort"]=function(){abort("'abort' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"Pointer_stringify"))Module["Pointer_stringify"]=function(){abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};if(!Object.getOwnPropertyDescriptor(Module,"warnOnce"))Module["warnOnce"]=function(){abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");};Module["writeStackCookie"]=writeStackCookie;Module["checkStackCookie"]=checkStackCookie;Module["abortStackOverflow"]=abortStackOverflow;if(!Object.getOwnPropertyDescriptor(Module,"ALLOC_NORMAL"))Object.defineProperty(Module,"ALLOC_NORMAL",{configurable:true,get:function(){abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");}});if(!Object.getOwnPropertyDescriptor(Module,"ALLOC_STACK"))Object.defineProperty(Module,"ALLOC_STACK",{configurable:true,get:function(){abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");}});if(!Object.getOwnPropertyDescriptor(Module,"ALLOC_DYNAMIC"))Object.defineProperty(Module,"ALLOC_DYNAMIC",{configurable:true,get:function(){abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");}});if(!Object.getOwnPropertyDescriptor(Module,"ALLOC_NONE"))Object.defineProperty(Module,"ALLOC_NONE",{configurable:true,get:function(){abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)");}});if(!Object.getOwnPropertyDescriptor(Module,"calledRun"))Object.defineProperty(Module,"calledRun",{configurable:true,get:function(){abort("'calledRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you");}});var calledRun;Module["then"]=function(func){if(calledRun){func(Module);}else {var old=Module["onRuntimeInitialized"];Module["onRuntimeInitialized"]=function(){if(old)old();func(Module);};}return Module};function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status;}dependenciesFulfilled=function runCaller(){if(!calledRun)run();if(!calledRun)dependenciesFulfilled=runCaller;};function run(args){if(runDependencies>0){return}writeStackCookie();preRun();if(runDependencies>0)return;function doRun(){if(calledRun)return;calledRun=true;if(ABORT)return;initRuntime();preMain();if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();assert(!Module["_main"],'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');postRun();}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(function(){setTimeout(function(){Module["setStatus"]("");},1);doRun();},1);}else {doRun();}checkStackCookie();}Module["run"]=run;function checkUnflushedContent(){var print=out;var printErr=err;var has=false;out=err=function(x){has=true;};try{var flush=flush_NO_FILESYSTEM;if(flush)flush(0);}catch(e){}out=print;err=printErr;if(has){warnOnce("stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.");warnOnce("(this may also be due to not including full filesystem support - try building with -s FORCE_FILESYSTEM=1)");}}function exit(status,implicit){checkUnflushedContent();if(implicit&&noExitRuntime&&status===0){return}if(noExitRuntime){if(!implicit){err("program exited (with status: "+status+"), but EXIT_RUNTIME is not set, so halting execution but not exiting the runtime or preventing further async execution (build with EXIT_RUNTIME=1, if you want a true shutdown)");}}else {ABORT=true;exitRuntime();if(Module["onExit"])Module["onExit"](status);}quit_(status,new ExitStatus(status));}if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()();}}noExitRuntime=true;run();


  return Module
}
);
})();
module.exports = Module;
}(woff2$1));

/**
 * @file woff2 wasm build of google woff2
 * thanks to woff2-asm
 * https://github.com/alimilhim/woff2-wasm
 * @author mengke01(kekee000@gmail.com)
 */

function convertFromVecToUint8Array(vector) {
    const arr = [];
    for (let i = 0, l = vector.size(); i < l; i++) {
        arr.push(vector.get(i));
    }
    return new Uint8Array(arr);
}


// eslint-disable-next-line import/no-commonjs
var woff2 = {

    woff2Module: null,

    /**
     * 是否已经加载完毕
     *
     * @return {boolean}
     */
    isInited() {
        return this.woff2Module
            && this.woff2Module.woff2Enc
            && this.woff2Module.woff2Dec;
    },

    /**
     * 初始化 woff 模块
     *
     * @param {string|ArrayBuffer} wasmUrl woff2.wasm file url
     * @return {Promise}
     */
    init(wasmUrl) {
        return new Promise(resolve => {
            if (this.woff2Module) {
                resolve(this);
                return;
            }

            // for browser
            const moduleLoader = woff2$1.exports;
            let moduleLoaderConfig = null;
            if (typeof window !== 'undefined') {
                moduleLoaderConfig = {
                    locateFile(path) {
                        if (path.endsWith('.wasm')) {
                            return wasmUrl;
                        }
                        return path;
                    }
                };
            }
            // for nodejs
            else {
                moduleLoaderConfig = {
                    wasmBinaryFile: __dirname + '/woff2.wasm'
                };
            }
            const woff2Module = moduleLoader(moduleLoaderConfig);
            woff2Module.onRuntimeInitialized = () => {
                this.woff2Module = woff2Module;
                resolve(this);
            };
        });
    },

    /**
     * 将ttf buffer 转换成 woff2 buffer
     *
     * @param {ArrayBuffer|Buffer|Array} ttfBuffer ttf buffer
     * @return {Uint8Array} uint8 array
     */
    encode(ttfBuffer) {
        const buffer = new Uint8Array(ttfBuffer);
        const woffbuff = this.woff2Module.woff2Enc(buffer, buffer.byteLength);
        return convertFromVecToUint8Array(woffbuff);
    },

    /**
     * 将woff2 buffer 转换成 ttf buffer
     *
     * @param {ArrayBuffer|Buffer|Array} woff2Buffer woff2 buffer
     * @return {Uint8Array} uint8 array
     */
    decode(woff2Buffer) {
        const buffer = new Uint8Array(woff2Buffer);
        const ttfbuff = this.woff2Module.woff2Dec(buffer, buffer.byteLength);
        return convertFromVecToUint8Array(ttfbuff);
    }
};

/**
 * @file ttf to woff2
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * ttf格式转换成woff2字体格式
 *
 * @param {ArrayBuffer} ttfBuffer ttf缓冲数组
 * @param {Object} options 选项
 *
 * @return {Promise.<ArrayBuffer>} woff格式byte流
 */
// eslint-disable-next-line no-unused-vars
function ttftowoff2(ttfBuffer, options = {}) {
    if (!woff2.isInited()) {
        throw new Error('use woff2.init() to init woff2 module!');
    }

    const result = woff2.encode(ttfBuffer);
    return result.buffer;
}

/**
 * @file woff2 to ttf
 * @author mengke01(kekee000@gmail.com)
 */


/**
 * ttf格式转换成woff2字体格式
 *
 * @param {ArrayBuffer} woff2Buffer ttf缓冲数组
 * @param {Object} options 选项
 *
 * @return {ArrayBuffer} woff格式byte流
 */
// eslint-disable-next-line no-unused-vars
function woff2tottf(woff2Buffer, options = {}) {
    if (!woff2.isInited()) {
        throw new Error('use woff2.init() to init woff2 module!');
    }
    const result = woff2.decode(woff2Buffer);
    return result.buffer;
}

/**
 * @file 二进制byte流转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 二进制byte流转base64编码
 *
 * @param {ArrayBuffer|Array} buffer ArrayBuffer对象
 * @return {string} base64编码
 */
function bytes2base64(buffer) {
    let str = '';
    let length;
    let i;
    // ArrayBuffer
    if (buffer instanceof ArrayBuffer) {
        length = buffer.byteLength;
        const view = new DataView(buffer, 0, length);
        for (i = 0; i < length; i++) {
            str += String.fromCharCode(view.getUint8(i, false));
        }
    }
    // Array
    else if (buffer.length) {
        length = buffer.length;
        for (i = 0; i < length; i++) {
            str += String.fromCharCode(buffer[i]);
        }
    }

    if (!str) {
        return '';
    }
    return typeof btoa !== 'undefined'
        ? btoa(str)
        : Buffer.from(str, 'binary').toString('base64');
}

/**
 * @file ttf数组转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * ttf数组转base64编码
 *
 * @param {Array} arrayBuffer ArrayBuffer对象
 * @return {string} base64编码
 */
function ttf2base64(arrayBuffer) {
    return 'data:font/ttf;charset=utf-8;base64,' + bytes2base64(arrayBuffer);
}

/**
 * @file eot数组转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * eot数组转base64编码
 *
 * @param {Array} arrayBuffer ArrayBuffer对象
 * @return {string} base64编码
 */
function eot2base64(arrayBuffer) {
    return 'data:font/eot;charset=utf-8;base64,' + bytes2base64(arrayBuffer);
}

/**
 * @file woff数组转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * woff数组转base64编码
 *
 * @param {Array} arrayBuffer ArrayBuffer对象
 * @return {string} base64编码
 */
function woff2base64(arrayBuffer) {
    return 'data:font/woff;charset=utf-8;base64,' + bytes2base64(arrayBuffer);
}

/**
 * @file svg字符串转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * svg字符串转base64编码
 *
 * @param {string} svg svg对象
 * @param {string} scheme  头部
 * @return {string} base64编码
 */
function svg2base64(svg, scheme = 'font/svg') {
    if (typeof btoa === 'undefined') {
        return 'data:' + scheme + ';charset=utf-8;base64,'
            + Buffer.from(svg, 'binary').toString('base64');
    }
    return 'data:' + scheme + ';charset=utf-8;base64,' + btoa(svg);
}

/**
 * @file woff2数组转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * woff数组转base64编码
 *
 * @param {Array} arrayBuffer ArrayBuffer对象
 * @return {string} base64编码
 */
function woff2tobase64(arrayBuffer) {
    return 'data:font/woff2;charset=utf-8;base64,' + bytes2base64(arrayBuffer);
}

/**
 * @file 字体管理对象，处理字体相关的读取、查询、转换
 *
 * @author mengke01(kekee000@gmail.com)
 */

// 必须是nodejs环境下的Buffer对象才能触发buffer转换
const SUPPORT_BUFFER = typeof process === 'object'
    && typeof process.versions === 'object'
    && typeof process.versions.node !== 'undefined'
    && typeof Buffer === 'function';

class Font {

    /**
     * 字体对象构造函数
     *
     * @param {ArrayBuffer|Buffer|string} buffer  字体数据
     * @param {Object} options  读取参数
     */
    constructor(buffer, options = {type: 'ttf'}) {
        // 字形对象
        if (typeof buffer === 'object' && buffer.glyf) {
            this.set(buffer);
        }
        // buffer
        else if (buffer) {
            this.read(buffer, options);
        }
        // 空
        else {
            this.readEmpty();
        }
    }

    /**
     * 创建一个空的ttfObject对象
     *
     * @return {Font}
     */
    readEmpty() {
        this.data = getEmpty();
        return this;
    }

    /**
     * 读取字体数据
     *
     * @param {ArrayBuffer|Buffer|string} buffer  字体数据
     * @param {Object} options  读取参数
     * @param {string} options.type 字体类型
     *
     * ttf, woff , eot 读取配置
     * @param {boolean} options.hinting 保留hinting信息
     * @param {boolean} options.compound2simple 复合字形转简单字形
     *
     * woff 读取配置
     * @param {Function} options.inflate 解压相关函数
     *
     * svg 读取配置
     * @param {boolean} options.combinePath 是否合并成单个字形，仅限于普通svg导入
     * @return {Font}
     */
    read(buffer, options) {
        // nodejs buffer
        if (SUPPORT_BUFFER) {
            if (buffer instanceof Buffer) {
                buffer = bufferTool.toArrayBuffer(buffer);
            }
        }

        if (options.type === 'ttf') {
            this.data = new TTFReader(options).read(buffer);
        }
        else if (options.type === 'otf') {
            this.data = otf2ttfobject(buffer, options);
        }
        else if (options.type === 'eot') {
            buffer = eot2ttf(buffer, options);
            this.data = new TTFReader(options).read(buffer);
        }
        else if (options.type === 'woff') {
            buffer = woff2ttf(buffer, options);
            this.data = new TTFReader(options).read(buffer);
        }
        else if (options.type === 'woff2') {
            buffer = woff2tottf(buffer, options);
            this.data = new TTFReader(options).read(buffer);
        }
        else if (options.type === 'svg') {
            this.data = svg2ttfObject(buffer, options);
        }
        else {
            throw new Error('not support font type' + options.type);
        }

        this.type = options.type;
        return this;
    }

    /**
     * 写入字体数据
     *
     * @param {Object} options  写入参数
     * @param {string} options.type   字体类型, 默认 ttf
     * @param {boolean} options.toBuffer nodejs 环境中返回 Buffer 对象, 默认 true
     *
     * ttf 字体参数
     * @param {boolean} options.hinting 保留hinting信息
     *
     * svg,woff 字体参数
     * @param {Object} options.metadata 字体相关的信息
     *
     * woff 字体参数
     * @param {Function} options.deflate 压缩相关函数
     * @return {Buffer|ArrayBuffer|string}
     */
    write(options = {}) {
        if (!options.type) {
            options.type = this.type;
        }

        let buffer = null;
        if (options.type === 'ttf') {
            buffer = new TTFWriter(options).write(this.data);
        }
        else if (options.type === 'eot') {
            buffer = new TTFWriter(options).write(this.data);
            buffer = ttf2eot(buffer, options);
        }
        else if (options.type === 'woff') {
            buffer = new TTFWriter(options).write(this.data);
            buffer = ttf2woff(buffer, options);
        }
        else if (options.type === 'woff2') {
            buffer = new TTFWriter(options).write(this.data);
            buffer = ttftowoff2(buffer, options);
        }
        else if (options.type === 'svg') {
            buffer = ttf2svg(this.data, options);
        }
        else if (options.type === 'symbol') {
            buffer = ttf2symbol(this.data, options);
        }
        else {
            throw new Error('not support font type' + options.type);
        }

        if (SUPPORT_BUFFER) {
            if (false !== options.toBuffer && buffer instanceof ArrayBuffer) {
                buffer = bufferTool.toBuffer(buffer);
            }
        }

        return buffer;
    }

    /**
     * 转换成 base64编码
     *
     * @param {Object} options  写入参数
     * @param {string} options.type   字体类型, 默认 ttf
     * 其他 options参数, 参考 write
     * @see write
     *
     * @param {ArrayBuffer} buffer  如果提供了buffer数据则使用 buffer数据, 否则转换现有的 font
     * @return {string}
     */
    toBase64(options, buffer) {
        if (!options.type) {
            options.type = this.type;
        }

        if (buffer) {
            if (SUPPORT_BUFFER) {
                if (buffer instanceof Buffer) {
                    buffer = bufferTool.toArrayBuffer(buffer);
                }
            }
        }
        else {
            options.toBuffer = false;
            buffer = this.write(options);
        }

        let base64Str;
        if (options.type === 'ttf') {
            base64Str = ttf2base64(buffer);
        }
        else if (options.type === 'eot') {
            base64Str = eot2base64(buffer);
        }
        else if (options.type === 'woff') {
            base64Str = woff2base64(buffer);
        }
        else if (options.type === 'woff2') {
            base64Str = woff2tobase64(buffer);
        }
        else if (options.type === 'svg') {
            base64Str = svg2base64(buffer);
        }
        else if (options.type === 'symbol') {
            base64Str = svg2base64(buffer, 'image/svg+xml');
        }
        else {
            throw new Error('not support font type' + options.type);
        }

        return base64Str;
    }

    /**
     * 设置 font 对象
     *
     * @param {Object} data font的ttfObject对象
     * @return {this}
     */
    set(data) {
        this.data = data;
        return this;
    }

    /**
     * 获取 font 数据
     *
     * @return {Object} ttfObject 对象
     */
    get() {
        return this.data;
    }

    /**
     * 对字形数据进行优化
     *
     * @param  {Object} out  输出结果
     * @param  {boolean|Object} out.result `true` 或者有问题的地方
     * @return {Font}
     */
    optimize(out) {
        const result = optimizettf(this.data);
        if (out) {
            out.result = result;
        }
        return this;
    }

    /**
     * 将字体中的复合字形转为简单字形
     *
     * @return {this}
     */
    compound2simple() {
        const ttf = new TTF(this.data);
        ttf.compound2simple();
        this.data = ttf.get();
        return this;
    }

    /**
     * 对字形按照unicode编码排序
     *
     * @return {this}
     */
    sort() {
        const ttf = new TTF(this.data);
        ttf.sortGlyf();
        this.data = ttf.get();
        return this;
    }

    /**
     * 查找相关字形
     *
     * @param  {Object} condition 查询条件
     * @param  {Array|number} condition.unicode unicode编码列表或者单个unicode编码
     * @param  {string} condition.name glyf名字，例如`uniE001`, `uniE`
     * @param  {Function} condition.filter 自定义过滤器
     * @example
     *     condition.filter(glyf) {
     *         return glyf.name === 'logo';
     *     }
     * @return {Array}  glyf字形列表
     */
    find(condition) {
        const ttf = new TTF(this.data);
        const indexList = ttf.findGlyf(condition);
        return indexList.length ? ttf.getGlyf(indexList) : indexList;
    }

    /**
     * 合并 font 到当前的 font
     *
     * @param {Object} font Font 对象
     * @param {Object} options 参数选项
     * @param {boolean} options.scale 是否自动缩放
     * @param {boolean} options.adjustGlyf 是否调整字形以适应边界
     *                                     (和 options.scale 参数互斥)
     *
     * @return {Font}
     */
    merge(font, options) {
        const ttf = new TTF(this.data);
        ttf.mergeGlyf(font.get(), options);
        this.data = ttf.get();
        return this;
    }
}

/**
 * 读取字体数据
 *
 * @param {ArrayBuffer|Buffer|string} buffer 字体数据
 * @param {Object} options  读取参数
 * @return {Font}
 */
Font.create = function (buffer, options) {
    return new Font(buffer, options);
};

/**
 * base64序列化buffer 数据
 *
 * @param {ArrayBuffer|Buffer|string} buffer 字体数据
 * @return {Font}
 */
Font.toBase64 = function (buffer) {
    if (typeof buffer === 'string') {
        // node 环境中没有 btoa 函数
        if (typeof btoa === 'undefined') {
            return Buffer.from(buffer, 'binary').toString('base64');
        }

        return btoa(buffer);
    }
    return bytes2base64(buffer);
};

/**
 * @file ttf转icon
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * listUnicode
 *
 * @param  {Array} unicode unicode
 * @return {string}         unicode string
 */
function listUnicode(unicode) {
    return unicode.map((u) => '\\' + u.toString(16)).join(',');
}

/**
 * ttf数据结构转icon数据结构
 *
 * @param {ttfObject} ttf ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 * @param {Object} options.iconPrefix icon 前缀
 * @return {Object} icon obj
 */
function ttfobject2icon(ttf, options = {}) {

    const glyfList = [];

    // glyf 信息
    const filtered = ttf.glyf.filter((g) => g.name !== '.notdef'
            && g.name !== '.null'
            && g.name !== 'nonmarkingreturn'
            && g.unicode && g.unicode.length);

    filtered.forEach((g, i) => {
        glyfList.push({
            code: '&#x' + g.unicode[0].toString(16) + ';',
            codeName: listUnicode(g.unicode),
            name: g.name,
            id: getSymbolId(g, i)
        });
    });

    return {
        fontFamily: ttf.name.fontFamily || config.name.fontFamily,
        iconPrefix: options.iconPrefix || 'icon',
        glyfList
    };

}


/**
 * ttf格式转换成icon
 *
 * @param {ArrayBuffer|ttfObject} ttfBuffer ttf缓冲数组或者ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 *
 * @return {Object} icon object
 */
function ttf2icon(ttfBuffer, options = {}) {
    // 读取ttf二进制流
    if (ttfBuffer instanceof ArrayBuffer) {
        const reader = new TTFReader();
        const ttfObject = reader.read(ttfBuffer);
        reader.dispose();

        return ttfobject2icon(ttfObject, options);
    }
    // 读取ttfObject
    else if (ttfBuffer.version && ttfBuffer.glyf) {

        return ttfobject2icon(ttfBuffer, options);
    }

    error.raise(10101);
}

/**
 * @file 主函数
 * @author mengke01(kekee000@gmail.com)
 */

const modules = {
    Font,
    TTF,
    TTFReader,
    TTFWriter,
    ttf2eot,
    eot2ttf,
    ttf2woff,
    woff2ttf,
    ttf2svg,
    svg2ttfobject: svg2ttfObject,
    Reader,
    Writer,
    OTFReader,
    otf2ttfobject,
    ttf2base64,
    ttf2icon,
    ttftowoff2,
    woff2tottf,
    woff2
};

{
    // eslint-disable-next-line import/no-commonjs
    module.exports = modules;
}

function ReadFontDetail(file) {
    const font = Font.create(file, {
        type: "ttf",
        subset: [],
        hinting: true,
        compound2simple: true,
    });
    const fontObj = font.get();

    return fontObj.name;
}
function ReadFontUnicode(file) {
    const font = Font.create(file, {
        type: "ttf",
        subset: [],
        hinting: true,
        compound2simple: true,
    });
    const fontObj = font.get();
    const result = Object.keys(fontObj.cmap);
    console.log(" - 总共找到 " + result.length + " 个字符");
    return result;
}
// 裁切一个 woff2 文件出来
// file: Buffer
// subset: unicode Number Array
// chunkSize: How many fonts every chunk contain
async function CutFont(file, subset) {
    const font = Font.create(file, {
        type: "ttf",
        subset,
        hinting: true,
        compound2simple: true,
    });
    font.optimize();
    const fontObject = font.get();
    const subFontSize = fontObject.glyf
        .map((i) => i.unicode)
        .flat()
        .filter((i) => typeof i === "number").length;

    console.log(subFontSize);
    await woff2.init();
    return font.write({
        type: "woff2",
        hinting: true,
    });
}

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Built-in value references. */
var Symbol$1 = root.Symbol;

/** Used for built-in method references. */
var objectProto$4 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$4.toString;

/** Built-in value references. */
var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty$3.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString$1.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$3 = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto$3.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

/** Used to match a single whitespace character. */
var reWhitespace = /\s/;

/**
 * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
 * character of `string`.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {number} Returns the index of the last non-whitespace character.
 */
function trimmedEndIndex(string) {
  var index = string.length;

  while (index-- && reWhitespace.test(string.charAt(index))) {}
  return index;
}

/** Used to match leading whitespace. */
var reTrimStart = /^\s+/;

/**
 * The base implementation of `_.trim`.
 *
 * @private
 * @param {string} string The string to trim.
 * @returns {string} Returns the trimmed string.
 */
function baseTrim(string) {
  return string
    ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, '')
    : string;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = baseTrim(value);
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_INTEGER = 1.7976931348623157e+308;

/**
 * Converts `value` to a finite number.
 *
 * @static
 * @memberOf _
 * @since 4.12.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted number.
 * @example
 *
 * _.toFinite(3.2);
 * // => 3.2
 *
 * _.toFinite(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toFinite(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toFinite('3.2');
 * // => 3.2
 */
function toFinite(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = (value < 0 ? -1 : 1);
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}

/**
 * Converts `value` to an integer.
 *
 * **Note:** This method is loosely based on
 * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted integer.
 * @example
 *
 * _.toInteger(3.2);
 * // => 3
 *
 * _.toInteger(Number.MIN_VALUE);
 * // => 0
 *
 * _.toInteger(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toInteger('3.2');
 * // => 3
 */
function toInteger(value) {
  var result = toFinite(value),
      remainder = result % 1;

  return result === result ? (remainder ? result - remainder : result) : 0;
}

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/** Used for built-in method references. */
var funcProto$1 = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString$1 = funcProto$1.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString$1.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto$2 = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty$2 = objectProto$2.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty$2).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

/** Used to detect hot functions by number of calls within a span of milliseconds. */
var HOT_COUNT = 800,
    HOT_SPAN = 16;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeNow = Date.now;

/**
 * Creates a function that'll short out and invoke `identity` instead
 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
 * milliseconds.
 *
 * @private
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new shortable function.
 */
function shortOut(func) {
  var count = 0,
      lastCalled = 0;

  return function() {
    var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(undefined, arguments);
  };
}

/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var baseSetToString = !defineProperty ? identity : function(func, string) {
  return defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant(string),
    'writable': true
  });
};

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var setToString = shortOut(baseSetToString);

/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function baseIsNaN(value) {
  return value !== value;
}

/**
 * A specialized version of `_.indexOf` which performs strict equality
 * comparisons of values, i.e. `===`.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function strictIndexOf(array, value, fromIndex) {
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  return value === value
    ? strictIndexOf(array, value, fromIndex)
    : baseFindIndex(array, baseIsNaN, fromIndex);
}

/**
 * A specialized version of `_.includes` for arrays without support for
 * specifying an index to search from.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludes(array, value) {
  var length = array == null ? 0 : array.length;
  return !!length && baseIndexOf(array, value, 0) > -1;
}

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER$1 = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER$1 : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax$1 = Math.max;

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest(func, start, transform) {
  start = nativeMax$1(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax$1(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/* Built-in method references that are verified to be native. */
var nativeCreate = getNative(Object, 'create');

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED$2 = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED$2 ? undefined : result;
  }
  return hasOwnProperty$1.call(data, key) ? data[key] : undefined;
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED$1 : value;
  return this;
}

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/* Built-in method references that are verified to be native. */
var Map$1 = getNative(root, 'Map');

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map$1 || ListCache),
    'string': new Hash
  };
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeCeil = Math.ceil,
    nativeMax = Math.max;

/**
 * Creates an array of elements split into groups the length of `size`.
 * If `array` can't be split evenly, the final chunk will be the remaining
 * elements.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Array
 * @param {Array} array The array to process.
 * @param {number} [size=1] The length of each chunk
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {Array} Returns the new array of chunks.
 * @example
 *
 * _.chunk(['a', 'b', 'c', 'd'], 2);
 * // => [['a', 'b'], ['c', 'd']]
 *
 * _.chunk(['a', 'b', 'c', 'd'], 3);
 * // => [['a', 'b', 'c'], ['d']]
 */
function chunk(array, size, guard) {
  if ((guard ? isIterateeCall(array, size, guard) : size === undefined)) {
    size = 1;
  } else {
    size = nativeMax(toInteger(size), 0);
  }
  var length = array == null ? 0 : array.length;
  if (!length || size < 1) {
    return [];
  }
  var index = 0,
      resIndex = 0,
      result = Array(nativeCeil(length / size));

  while (index < length) {
    result[resIndex++] = baseSlice(array, index, (index += size));
  }
  return result;
}

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}

/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;

  this.__data__ = new MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;

/**
 * Checks if a `cache` value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * This function is like `arrayIncludes` except that it accepts a comparator.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @param {Function} comparator The comparator invoked per element.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludesWith(array, value, comparator) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (comparator(value, array[index])) {
      return true;
    }
  }
  return false;
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMin = Math.min;

/**
 * The base implementation of methods like `_.intersection`, without support
 * for iteratee shorthands, that accepts an array of arrays to inspect.
 *
 * @private
 * @param {Array} arrays The arrays to inspect.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new array of shared values.
 */
function baseIntersection(arrays, iteratee, comparator) {
  var includes = comparator ? arrayIncludesWith : arrayIncludes,
      length = arrays[0].length,
      othLength = arrays.length,
      othIndex = othLength,
      caches = Array(othLength),
      maxLength = Infinity,
      result = [];

  while (othIndex--) {
    var array = arrays[othIndex];
    if (othIndex && iteratee) {
      array = arrayMap(array, baseUnary(iteratee));
    }
    maxLength = nativeMin(array.length, maxLength);
    caches[othIndex] = !comparator && (iteratee || (length >= 120 && array.length >= 120))
      ? new SetCache(othIndex && array)
      : undefined;
  }
  array = arrays[0];

  var index = -1,
      seen = caches[0];

  outer:
  while (++index < length && result.length < maxLength) {
    var value = array[index],
        computed = iteratee ? iteratee(value) : value;

    value = (comparator || value !== 0) ? value : 0;
    if (!(seen
          ? cacheHas(seen, computed)
          : includes(result, computed, comparator)
        )) {
      othIndex = othLength;
      while (--othIndex) {
        var cache = caches[othIndex];
        if (!(cache
              ? cacheHas(cache, computed)
              : includes(arrays[othIndex], computed, comparator))
            ) {
          continue outer;
        }
      }
      if (seen) {
        seen.push(computed);
      }
      result.push(value);
    }
  }
  return result;
}

/**
 * Casts `value` to an empty array if it's not an array like object.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array|Object} Returns the cast array-like object.
 */
function castArrayLikeObject(value) {
  return isArrayLikeObject(value) ? value : [];
}

/**
 * Creates an array of unique values that are included in all given arrays
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons. The order and references of result values are
 * determined by the first array.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {...Array} [arrays] The arrays to inspect.
 * @returns {Array} Returns the new array of intersecting values.
 * @example
 *
 * _.intersection([2, 1], [2, 3]);
 * // => [2]
 */
var intersection = baseRest(function(arrays) {
  var mapped = arrayMap(arrays, castArrayLikeObject);
  return (mapped.length && mapped[0] === arrays[0])
    ? baseIntersection(mapped)
    : [];
});

// 分包系统
async function CutTargetFont (
    { file, size, name },
    { other, TC, SC },
    chunkOptions = {}
) {
    console.log(name, formatBytes(size));

    const allCode = await ReadFontUnicode(file);

    const total = { other, TC, SC };
    const last = Object.entries(total).reduce((col, [key, value]) => {
        if (value.length) {
            const subset = intersection(allCode, value);
            const size = Math.ceil(subset.length / chunkOptions[key]);
            const result = chunk(subset, size);
            col.set(key, result);
            console.log(key, "分包数目: ", value.length);
        }
        return col;
    }, new Map());
    return Object.fromEntries(last.entries());
}

async function index ({
    FontPath,
    destFold = "./build",
    css: {
        fontFamily = "",
        fontWeight = "",
        fontStyle = "",
        fontDisplay = "",
    } = {},
    cssFileName = "result", // 生成 CSS 文件的名称
    chunkOptions = {}, //
    charset = {},
}) {
    charset = {
        SC: true, // 简体
        other: true, // 非中文及一些符号
        TC: false, // 繁体
        ...charset,
    };
    chunkOptions = {
        TC: 10,
        SC: 10,
        other: 2,
        ...chunkOptions,
    };
    const tra = new Transaction(
        [
            ["准备字符集", () => prepareCharset(charset)],
            [
                "读取字体",
                async () => {
                    let stat = lib.statSync(FontPath);
                    const file = await lib.readFile(FontPath);
                    const detail = ReadFontDetail(FontPath);
                    return { ...detail, ...stat, file };
                },
            ],
            [
                "校对和切割目标字体",
                async (charMap, result) => {
                    return await CutTargetFont(
                        charMap.get("读取字体"),
                        result,
                        chunkOptions
                    );
                },
            ],
            [
                "开始切割分包",
                async (charMap, { other = [], SC = [], TC = [] }) => {
                    const { file } = charMap.get("读取字体");
                    const promises = [...other, ...SC, ...TC].map(
                        (subsetArray) =>
                            Promise.all(
                                subsetArray.map(async (subset) => {
                                    const font = CutFont(file, subset);
                                    return { font, subset };
                                })
                            )
                    );
                    return Promise.all(promises);
                },
            ],
            [
                "输出 woff2 文件",
                async (charMap, last) => {
                    const fileArray = last.flat();
                    let [promises, IDCollection] = fileArray.reduce(
                        (col, { font, subset }) => {
                            const id = nanoid();
                            const Path = require$$1.join(destFold, id + ".woff2");
                            console.log("生成文件:", id, font.length);
                            const promise = outputFile(Path, font);
                            col[0].push(promise);
                            col[1].push({ id, subset });
                            return col;
                        },
                        [[], []]
                    );
                    return Promise.all(promises).then(() => IDCollection);
                },
            ],
            [
                "生成 CSS 文件",
                async (charMap, IDCollection) => {
                    const { fontFamily: ff } = charMap.get("读取字体");
                    const cssStyleSheet = IDCollection.map(({ id, subset }) => {
                        return `@font-face {
    font-family: ${fontFamily || ff};
    src: url("./${id}.woff2") format("woff2");
    font-style: ${fontStyle};
    font-weight: ${fontWeight};
    font-display: ${fontDisplay};
    unicode-range:${subset.map((i) => `U+${i.toString(16)}`).join(",")}
}`;
                    }).join("\n");
                    return outputFile(
                        require$$1.join(
                            destFold,
                            (cssFileName || "result") + ".woff2"
                        ),
                        cssStyleSheet
                    );
                },
            ],
            ["生成 Template.html 文件", () => {}],
            ["汇报数据大小", () => {}],
        ]
            .map((i) => {
                return [
                    ["start" + i[0], () => console.time(i[0])],
                    i,
                    ["end" + i[0], () => console.timeEnd(i[0])],
                ];
            })
            .flat()
    );
    return tra.run();
}

export default index;
