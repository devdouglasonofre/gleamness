// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label) => label in fields ? fields[label] : this[label]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array4, tail) {
    let t = tail || new Empty();
    for (let i = array4.length - 1; i >= 0; --i) {
      t = new NonEmpty(array4[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current)
      current = current.tail;
    return current !== void 0;
  }
  // @internal
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current)
      current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  // @internal
  countLength() {
    let current = this;
    let length4 = 0;
    while (current) {
      current = current.tail;
      length4++;
    }
    return length4 - 1;
  }
};
function prepend(element2, tail) {
  return new NonEmpty(element2, tail);
}
function toList(elements2, tail) {
  return List.fromArray(elements2, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var BitArray = class {
  /**
   * The size in bits of this bit array's data.
   *
   * @type {number}
   */
  bitSize;
  /**
   * The size in bytes of this bit array's data. If this bit array doesn't store
   * a whole number of bytes then this value is rounded up.
   *
   * @type {number}
   */
  byteSize;
  /**
   * The number of unused high bits in the first byte of this bit array's
   * buffer prior to the start of its data. The value of any unused high bits is
   * undefined.
   *
   * The bit offset will be in the range 0-7.
   *
   * @type {number}
   */
  bitOffset;
  /**
   * The raw bytes that hold this bit array's data.
   *
   * If `bitOffset` is not zero then there are unused high bits in the first
   * byte of this buffer.
   *
   * If `bitOffset + bitSize` is not a multiple of 8 then there are unused low
   * bits in the last byte of this buffer.
   *
   * @type {Uint8Array}
   */
  rawBuffer;
  /**
   * Constructs a new bit array from a `Uint8Array`, an optional size in
   * bits, and an optional bit offset.
   *
   * If no bit size is specified it is taken as `buffer.length * 8`, i.e. all
   * bytes in the buffer make up the new bit array's data.
   *
   * If no bit offset is specified it defaults to zero, i.e. there are no unused
   * high bits in the first byte of the buffer.
   *
   * @param {Uint8Array} buffer
   * @param {number} [bitSize]
   * @param {number} [bitOffset]
   */
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error(
        "BitArray can only be constructed from a Uint8Array"
      );
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(
        `BitArray bit offset is invalid: ${this.bitOffset}`
      );
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  /**
   * Returns a specific byte in this bit array. If the byte index is out of
   * range then `undefined` is returned.
   *
   * When returning the final byte of a bit array with a bit size that's not a
   * multiple of 8, the content of the unused low bits are undefined.
   *
   * @param {number} index
   * @returns {number | undefined}
   */
  byteAt(index3) {
    if (index3 < 0 || index3 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index3);
  }
  /** @internal */
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0; i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0; i < wholeByteCount; i++) {
        const a = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a = bitArrayByteAt(
          this.rawBuffer,
          this.bitOffset,
          wholeByteCount
        );
        const b = bitArrayByteAt(
          other.rawBuffer,
          other.bitOffset,
          wholeByteCount
        );
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Returns this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.byteAt()` or `BitArray.rawBuffer` instead.
   *
   * @returns {Uint8Array}
   */
  get buffer() {
    bitArrayPrintDeprecationWarning(
      "buffer",
      "Use BitArray.byteAt() or BitArray.rawBuffer instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.buffer does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer;
  }
  /**
   * Returns the length in bytes of this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.bitSize` or `BitArray.byteSize` instead.
   *
   * @returns {number}
   */
  get length() {
    bitArrayPrintDeprecationWarning(
      "length",
      "Use BitArray.bitSize or BitArray.byteSize instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.length does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer.length;
  }
};
function bitArrayByteAt(buffer, bitOffset, index3) {
  if (bitOffset === 0) {
    return buffer[index3] ?? 0;
  } else {
    const a = buffer[index3] << bitOffset & 255;
    const b = buffer[index3 + 1] >> 8 - bitOffset;
    return a | b;
  }
}
var UtfCodepoint = class {
  constructor(value) {
    this.value = value;
  }
};
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name, message) {
  if (isBitArrayDeprecationMessagePrinted[name]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name} property used in JavaScript FFI code. ${message}.`
  );
  isBitArrayDeprecationMessagePrinted[name] = true;
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value) {
    super();
    this[0] = value;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values2 = [x, y];
  while (values2.length) {
    let a = values2.pop();
    let b = values2.pop();
    if (a === b)
      continue;
    if (!isObject(a) || !isObject(b))
      return false;
    let unequal = !structurallyCompatibleObjects(a, b) || unequalDates(a, b) || unequalBuffers(a, b) || unequalArrays(a, b) || unequalMaps(a, b) || unequalSets(a, b) || unequalRegExps(a, b);
    if (unequal)
      return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a.equals(b))
          continue;
        else
          return false;
      } catch {
      }
    }
    let [keys2, get2] = getters(a);
    for (let k of keys2(a)) {
      values2.push(get2(a, k), get2(b, k));
    }
  }
  return true;
}
function getters(object3) {
  if (object3 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object3 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a, b) {
  return a instanceof Date && (a > b || a < b);
}
function unequalBuffers(a, b) {
  return !(a instanceof BitArray) && a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT && !(a.byteLength === b.byteLength && a.every((n, i) => n === b[i]));
}
function unequalArrays(a, b) {
  return Array.isArray(a) && a.length !== b.length;
}
function unequalMaps(a, b) {
  return a instanceof Map && a.size !== b.size;
}
function unequalSets(a, b) {
  return a instanceof Set && (a.size != b.size || [...a].some((e) => !b.has(e)));
}
function unequalRegExps(a, b) {
  return a instanceof RegExp && (a.source !== b.source || a.flags !== b.flags);
}
function isObject(a) {
  return typeof a === "object" && a !== null;
}
function structurallyCompatibleObjects(a, b) {
  if (typeof a !== "object" && typeof b !== "object" && (!a || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a instanceof c))
    return false;
  return a.constructor === b.constructor;
}
function makeError(variant, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra)
    error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var None = class extends CustomType {
};
function to_result(option, e) {
  if (option instanceof Some) {
    let a = option[0];
    return new Ok(a);
  } else {
    return new Error(e);
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function insert(dict2, key, value) {
  return map_insert(key, value, dict2);
}
function reverse_and_concat(loop$remaining, loop$accumulator) {
  while (true) {
    let remaining = loop$remaining;
    let accumulator = loop$accumulator;
    if (remaining.hasLength(0)) {
      return accumulator;
    } else {
      let first2 = remaining.head;
      let rest = remaining.tail;
      loop$remaining = rest;
      loop$accumulator = prepend(first2, accumulator);
    }
  }
}
function do_keys_loop(loop$list, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return reverse_and_concat(acc, toList([]));
    } else {
      let key = list2.head[0];
      let rest = list2.tail;
      loop$list = rest;
      loop$acc = prepend(key, acc);
    }
  }
}
function keys(dict2) {
  return do_keys_loop(map_to_list(dict2), toList([]));
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix.hasLength(0)) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list2) {
  return reverse_and_prepend(list2, toList([]));
}
function is_empty(list2) {
  return isEqual(list2, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list2.head;
      let rest$1 = list2.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map(list2, fun) {
  return map_loop(list2, fun, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first2 = loop$first;
    let second = loop$second;
    if (first2.hasLength(0)) {
      return second;
    } else {
      let first$1 = first2.head;
      let rest$1 = first2.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first2, second) {
  return append_loop(reverse(first2), second);
}
function prepend2(list2, item) {
  return prepend(item, list2);
}
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list2 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list2.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list2.head;
      let rest$1 = list2.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function index_fold_loop(loop$over, loop$acc, loop$with, loop$index) {
  while (true) {
    let over = loop$over;
    let acc = loop$acc;
    let with$ = loop$with;
    let index3 = loop$index;
    if (over.hasLength(0)) {
      return acc;
    } else {
      let first$1 = over.head;
      let rest$1 = over.tail;
      loop$over = rest$1;
      loop$acc = with$(acc, first$1, index3);
      loop$with = with$;
      loop$index = index3 + 1;
    }
  }
}
function index_fold(list2, initial, fun) {
  return index_fold_loop(list2, initial, fun, 0);
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function map2(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    let e = result[0];
    return new Error(e);
  }
}
function map_error(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(x);
  } else {
    let error = result[0];
    return new Error(fun(error));
  }
}
function try$(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return fun(x);
  } else {
    let e = result[0];
    return new Error(e);
  }
}
function unwrap(result, default$) {
  if (result.isOk()) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}
function replace_error(result, error) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(x);
  } else {
    return new Error(error);
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic.mjs
var DecodeError = class extends CustomType {
  constructor(expected, found, path) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path;
  }
};
function map_errors(result, f) {
  return map_error(
    result,
    (_capture) => {
      return map(_capture, f);
    }
  );
}
function string(data) {
  return decode_string(data);
}
function do_any(decoders) {
  return (data) => {
    if (decoders.hasLength(0)) {
      return new Error(
        toList([new DecodeError("another type", classify_dynamic(data), toList([]))])
      );
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder(data);
      if ($.isOk()) {
        let decoded = $[0];
        return new Ok(decoded);
      } else {
        return do_any(decoders$1)(data);
      }
    }
  };
}
function push_path(error, name) {
  let name$1 = identity(name);
  let decoder = do_any(
    toList([
      decode_string,
      (x) => {
        return map2(decode_int(x), to_string);
      }
    ])
  );
  let name$2 = (() => {
    let $ = decoder(name$1);
    if ($.isOk()) {
      let name$22 = $[0];
      return name$22;
    } else {
      let _pipe = toList(["<", classify_dynamic(name$1), ">"]);
      let _pipe$1 = concat(_pipe);
      return identity(_pipe$1);
    }
  })();
  let _record = error;
  return new DecodeError(
    _record.expected,
    _record.found,
    prepend(name$2, error.path)
  );
}
function field(name, inner_type) {
  return (value) => {
    let missing_field_error = new DecodeError("field", "nothing", toList([]));
    return try$(
      decode_field(value, name),
      (maybe_inner) => {
        let _pipe = maybe_inner;
        let _pipe$1 = to_result(_pipe, toList([missing_field_error]));
        let _pipe$2 = try$(_pipe$1, inner_type);
        return map_errors(
          _pipe$2,
          (_capture) => {
            return push_path(_capture, name);
          }
        );
      }
    );
  };
}

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = new DataView(new ArrayBuffer(8));
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a, b) {
  return a ^ b + 2654435769 + (a << 6) + (a >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null)
    return 1108378658;
  if (u === void 0)
    return 1108378659;
  if (u === true)
    return 1108378657;
  if (u === false)
    return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index(bitmap, bit2) {
  return bitcount(bitmap & bit2 - 1);
}
function cloneAndSet(arr, at, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at] = val;
  return out;
}
function spliceIn(arr, at, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root, shift, hash, key, val, addedLeaf) {
  switch (root.type) {
    case ARRAY_NODE:
      return assocArray(root, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root.size + 1,
      array: cloneAndSet(root.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root;
      }
      return {
        type: ARRAY_NODE,
        size: root.size,
        array: cloneAndSet(root.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root.size,
      array: cloneAndSet(
        root.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root;
  }
  return {
    type: ARRAY_NODE,
    size: root.size,
    array: cloneAndSet(root.array, idx, n)
  };
}
function assocIndex(root, shift, hash, key, val, addedLeaf) {
  const bit2 = bitpos(hash, shift);
  const idx = index(root.bitmap, bit2);
  if ((root.bitmap & bit2) !== 0) {
    const node = root.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root;
      }
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root;
      }
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap,
      array: cloneAndSet(
        root.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root.array[j++];
          nodes[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
      };
    } else {
      const newArray = spliceIn(root.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap | bit2,
        array: newArray
      };
    }
  }
}
function assocCollision(root, shift, hash, key, val, addedLeaf) {
  if (hash === root.hash) {
    const idx = collisionIndexOf(root, key);
    if (idx !== -1) {
      const entry = root.array[idx];
      if (entry.v === val) {
        return root;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size = root.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root.array, size, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root.hash, shift),
      array: [root]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root, key) {
  const size = root.array.length;
  for (let i = 0; i < size; i++) {
    if (isEqual(key, root.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find(root, shift, hash, key) {
  switch (root.type) {
    case ARRAY_NODE:
      return findArray(root, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root, key);
  }
}
function findArray(root, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root.array[idx];
  if (node === void 0) {
    return void 0;
  }
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findIndex(root, shift, hash, key) {
  const bit2 = bitpos(hash, shift);
  if ((root.bitmap & bit2) === 0) {
    return void 0;
  }
  const idx = index(root.bitmap, bit2);
  const node = root.array[idx];
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root, key) {
  const idx = collisionIndexOf(root, key);
  if (idx < 0) {
    return void 0;
  }
  return root.array[idx];
}
function without(root, shift, hash, key) {
  switch (root.type) {
    case ARRAY_NODE:
      return withoutArray(root, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root, key);
  }
}
function withoutArray(root, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root.array[idx];
  if (node === void 0) {
    return root;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root;
    }
  }
  if (n === void 0) {
    if (root.size <= MIN_ARRAY_NODE) {
      const arr = root.array;
      const out = new Array(root.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root.size - 1,
      array: cloneAndSet(root.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root.size,
    array: cloneAndSet(root.array, idx, n)
  };
}
function withoutIndex(root, shift, hash, key) {
  const bit2 = bitpos(hash, shift);
  if ((root.bitmap & bit2) === 0) {
    return root;
  }
  const idx = index(root.bitmap, bit2);
  const node = root.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, n)
      };
    }
    if (root.bitmap === bit2) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap ^ bit2,
      array: spliceOut(root.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root.bitmap === bit2) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap ^ bit2,
      array: spliceOut(root.array, idx)
    };
  }
  return root;
}
function withoutCollision(root, key) {
  const idx = collisionIndexOf(root, key);
  if (idx < 0) {
    return root;
  }
  if (root.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root.hash,
    array: spliceOut(root.array, idx)
  };
}
function forEach(root, fn) {
  if (root === void 0) {
    return;
  }
  const items = root.array;
  const size = items.length;
  for (let i = 0; i < size; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root, size) {
    this.root = root;
    this.size = size;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find(this.root, 0, getHash(key), key);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key, val) {
    const addedLeaf = { val: false };
    const root = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root, 0, getHash(key), key, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key), key);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    if (this.root === void 0) {
      return false;
    }
    return find(this.root, 0, getHash(key), key) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    try {
      this.forEach((v, k) => {
        if (!isEqual(o.get(k, !v), v)) {
          throw unequalDictSymbol;
        }
      });
      return true;
    } catch (e) {
      if (e === unequalDictSymbol) {
        return false;
      }
      throw e;
    }
  }
};
var unequalDictSymbol = Symbol();

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
var NOT_FOUND = {};
function identity(x) {
  return x;
}
function to_string(term) {
  return term.toString();
}
function float_to_string(float4) {
  const string4 = float4.toString().replace("+", "");
  if (string4.indexOf(".") >= 0) {
    return string4;
  } else {
    const index3 = string4.indexOf("e");
    if (index3 >= 0) {
      return string4.slice(0, index3) + ".0" + string4.slice(index3);
    } else {
      return string4 + ".0";
    }
  }
}
var segmenter = void 0;
function graphemes_iterator(string4) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter();
    return segmenter.segment(string4)[Symbol.iterator]();
  }
}
function pop_grapheme(string4) {
  let first2;
  const iterator = graphemes_iterator(string4);
  if (iterator) {
    first2 = iterator.next().value?.segment;
  } else {
    first2 = string4.match(/./su)?.[0];
  }
  if (first2) {
    return new Ok([first2, string4.slice(first2.length)]);
  } else {
    return new Error(Nil);
  }
}
function concat(xs) {
  let result = "";
  for (const x of xs) {
    result = result + x;
  }
  return result;
}
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var trim_start_regex = new RegExp(`^[${unicode_whitespaces}]*`);
var trim_end_regex = new RegExp(`[${unicode_whitespaces}]*$`);
function print_debug(string4) {
  if (typeof process === "object" && process.stderr?.write) {
    process.stderr.write(string4 + "\n");
  } else if (typeof Deno === "object") {
    Deno.stderr.writeSync(new TextEncoder().encode(string4 + "\n"));
  } else {
    console.log(string4);
  }
}
function new_map() {
  return Dict.new();
}
function map_to_list(map5) {
  return List.fromArray(map5.entries());
}
function map_get(map5, key) {
  const value = map5.get(key, NOT_FOUND);
  if (value === NOT_FOUND) {
    return new Error(Nil);
  }
  return new Ok(value);
}
function map_insert(key, value, map5) {
  return map5.set(key, value);
}
function classify_dynamic(data) {
  if (typeof data === "string") {
    return "String";
  } else if (typeof data === "boolean") {
    return "Bool";
  } else if (data instanceof Result) {
    return "Result";
  } else if (data instanceof List) {
    return "List";
  } else if (data instanceof BitArray) {
    return "BitArray";
  } else if (data instanceof Dict) {
    return "Dict";
  } else if (Number.isInteger(data)) {
    return "Int";
  } else if (Array.isArray(data)) {
    return `Tuple of ${data.length} elements`;
  } else if (typeof data === "number") {
    return "Float";
  } else if (data === null) {
    return "Null";
  } else if (data === void 0) {
    return "Nil";
  } else {
    const type = typeof data;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
function decoder_error(expected, got) {
  return decoder_error_no_classify(expected, classify_dynamic(got));
}
function decoder_error_no_classify(expected, got) {
  return new Error(
    List.fromArray([new DecodeError(expected, got, List.fromArray([]))])
  );
}
function decode_string(data) {
  return typeof data === "string" ? new Ok(data) : decoder_error("String", data);
}
function decode_int(data) {
  return Number.isInteger(data) ? new Ok(data) : decoder_error("Int", data);
}
function decode_field(value, name) {
  const not_a_map_error = () => decoder_error("Dict", value);
  if (value instanceof Dict || value instanceof WeakMap || value instanceof Map) {
    const entry = map_get(value, name);
    return new Ok(entry.isOk() ? new Some(entry[0]) : new None());
  } else if (value === null) {
    return not_a_map_error();
  } else if (Object.getPrototypeOf(value) == Object.prototype) {
    return try_get_field(value, name, () => new Ok(new None()));
  } else {
    return try_get_field(value, name, not_a_map_error);
  }
}
function try_get_field(value, field2, or_else) {
  try {
    return field2 in value ? new Ok(new Some(value[field2])) : or_else();
  } catch {
    return or_else();
  }
}
function bitwise_and(x, y) {
  return Number(BigInt(x) & BigInt(y));
}
function bitwise_or(x, y) {
  return Number(BigInt(x) | BigInt(y));
}
function bitwise_exclusive_or(x, y) {
  return Number(BigInt(x) ^ BigInt(y));
}
function bitwise_shift_left(x, y) {
  return Number(BigInt(x) << BigInt(y));
}
function bitwise_shift_right(x, y) {
  return Number(BigInt(x) >> BigInt(y));
}
function inspect(v) {
  const t = typeof v;
  if (v === true)
    return "True";
  if (v === false)
    return "False";
  if (v === null)
    return "//js(null)";
  if (v === void 0)
    return "Nil";
  if (t === "string")
    return inspectString(v);
  if (t === "bigint" || Number.isInteger(v))
    return v.toString();
  if (t === "number")
    return float_to_string(v);
  if (Array.isArray(v))
    return `#(${v.map(inspect).join(", ")})`;
  if (v instanceof List)
    return inspectList(v);
  if (v instanceof UtfCodepoint)
    return inspectUtfCodepoint(v);
  if (v instanceof BitArray)
    return inspectBitArray(v);
  if (v instanceof CustomType)
    return inspectCustomType(v);
  if (v instanceof Dict)
    return inspectDict(v);
  if (v instanceof Set)
    return `//js(Set(${[...v].map(inspect).join(", ")}))`;
  if (v instanceof RegExp)
    return `//js(${v})`;
  if (v instanceof Date)
    return `//js(Date("${v.toISOString()}"))`;
  if (v instanceof Function) {
    const args = [];
    for (const i of Array(v.length).keys())
      args.push(String.fromCharCode(i + 97));
    return `//fn(${args.join(", ")}) { ... }`;
  }
  return inspectObject(v);
}
function inspectString(str) {
  let new_str = '"';
  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    switch (char) {
      case "\n":
        new_str += "\\n";
        break;
      case "\r":
        new_str += "\\r";
        break;
      case "	":
        new_str += "\\t";
        break;
      case "\f":
        new_str += "\\f";
        break;
      case "\\":
        new_str += "\\\\";
        break;
      case '"':
        new_str += '\\"';
        break;
      default:
        if (char < " " || char > "~" && char < "\xA0") {
          new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
        } else {
          new_str += char;
        }
    }
  }
  new_str += '"';
  return new_str;
}
function inspectDict(map5) {
  let body = "dict.from_list([";
  let first2 = true;
  map5.forEach((value, key) => {
    if (!first2)
      body = body + ", ";
    body = body + "#(" + inspect(key) + ", " + inspect(value) + ")";
    first2 = false;
  });
  return body + "])";
}
function inspectObject(v) {
  const name = Object.getPrototypeOf(v)?.constructor?.name || "Object";
  const props = [];
  for (const k of Object.keys(v)) {
    props.push(`${inspect(k)}: ${inspect(v[k])}`);
  }
  const body = props.length ? " " + props.join(", ") + " " : "";
  const head = name === "Object" ? "" : name + " ";
  return `//js(${head}{${body}})`;
}
function inspectCustomType(record) {
  const props = Object.keys(record).map((label) => {
    const value = inspect(record[label]);
    return isNaN(parseInt(label)) ? `${label}: ${value}` : value;
  }).join(", ");
  return props ? `${record.constructor.name}(${props})` : record.constructor.name;
}
function inspectList(list2) {
  return `[${list2.toArray().map(inspect).join(", ")}]`;
}
function inspectBitArray(bits) {
  return `<<${Array.from(bits.buffer).join(", ")}>>`;
}
function inspectUtfCodepoint(codepoint2) {
  return `//utfcodepoint(${String.fromCodePoint(codepoint2.value)})`;
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function drop_start(loop$string, loop$num_graphemes) {
  while (true) {
    let string4 = loop$string;
    let num_graphemes = loop$num_graphemes;
    let $ = num_graphemes > 0;
    if (!$) {
      return string4;
    } else {
      let $1 = pop_grapheme(string4);
      if ($1.isOk()) {
        let string$1 = $1[0][1];
        loop$string = string$1;
        loop$num_graphemes = num_graphemes - 1;
      } else {
        return string4;
      }
    }
  }
}
function inspect2(term) {
  let _pipe = inspect(term);
  return identity(_pipe);
}

// build/dev/javascript/gleam_stdlib/gleam/io.mjs
function debug(term) {
  let _pipe = term;
  let _pipe$1 = inspect2(_pipe);
  print_debug(_pipe$1);
  return term;
}

// build/dev/javascript/iv/iv_ffi.mjs
var empty = () => [];
var singleton = (x) => [x];
var pair = (x, y) => [x, y];
var append4 = (xs, x) => [...xs, x];
var prepend3 = (xs, x) => [x, ...xs];
var concat2 = (xs, ys) => [...xs, ...ys];
var get1 = (idx, xs) => xs[idx - 1];
var set1 = (idx, xs, x) => xs.with(idx - 1, x);
var length2 = (xs) => xs.length;
var map3 = (xs, f) => xs.map(f);
var bsl = (a, b) => a << b;
var bsr = (a, b) => a >> b;

// build/dev/javascript/iv/iv/internal/vector.mjs
function fold_loop(loop$xs, loop$state, loop$idx, loop$len, loop$fun) {
  while (true) {
    let xs = loop$xs;
    let state = loop$state;
    let idx = loop$idx;
    let len = loop$len;
    let fun = loop$fun;
    let $ = idx <= len;
    if ($) {
      loop$xs = xs;
      loop$state = fun(state, get1(idx, xs));
      loop$idx = idx + 1;
      loop$len = len;
      loop$fun = fun;
    } else {
      return state;
    }
  }
}
function fold3(xs, state, fun) {
  let len = length2(xs);
  return fold_loop(xs, state, 1, len, fun);
}
function fold_skip_first(xs, state, fun) {
  let len = length2(xs);
  return fold_loop(xs, state, 2, len, fun);
}
function fold_right_loop(loop$xs, loop$state, loop$idx, loop$fun) {
  while (true) {
    let xs = loop$xs;
    let state = loop$state;
    let idx = loop$idx;
    let fun = loop$fun;
    let $ = idx > 0;
    if ($) {
      loop$xs = xs;
      loop$state = fun(state, get1(idx, xs));
      loop$idx = idx - 1;
      loop$fun = fun;
    } else {
      return state;
    }
  }
}
function fold_right(xs, state, fun) {
  let len = length2(xs);
  return fold_right_loop(xs, state, len, fun);
}
function find_map_loop(loop$xs, loop$idx, loop$len, loop$fun) {
  while (true) {
    let xs = loop$xs;
    let idx = loop$idx;
    let len = loop$len;
    let fun = loop$fun;
    let $ = idx <= len;
    if ($) {
      let item = get1(idx, xs);
      let $1 = fun(item);
      if ($1.isOk()) {
        let result = $1;
        return result;
      } else {
        loop$xs = xs;
        loop$idx = idx + 1;
        loop$len = len;
        loop$fun = fun;
      }
    } else {
      return new Error(void 0);
    }
  }
}
function find_map(xs, fun) {
  let len = length2(xs);
  return find_map_loop(xs, 1, len, fun);
}

// build/dev/javascript/iv/iv.mjs
var Empty2 = class extends CustomType {
};
var Array2 = class extends CustomType {
  constructor(shift, root) {
    super();
    this.shift = shift;
    this.root = root;
  }
};
var Balanced = class extends CustomType {
  constructor(size, children2) {
    super();
    this.size = size;
    this.children = children2;
  }
};
var Unbalanced = class extends CustomType {
  constructor(sizes, children2) {
    super();
    this.sizes = sizes;
    this.children = children2;
  }
};
var Leaf = class extends CustomType {
  constructor(children2) {
    super();
    this.children = children2;
  }
};
var Builder = class extends CustomType {
  constructor(nodes, items) {
    super();
    this.nodes = nodes;
    this.items = items;
  }
};
var Concatenated = class extends CustomType {
  constructor(merged) {
    super();
    this.merged = merged;
  }
};
var NoFreeSlot = class extends CustomType {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }
};
function node_size(node) {
  if (node instanceof Balanced) {
    let size = node.size;
    return size;
  } else if (node instanceof Leaf) {
    let children2 = node.children;
    return length2(children2);
  } else {
    let sizes = node.sizes;
    return get1(length2(sizes), sizes);
  }
}
function compute_sizes(nodes) {
  let first_size = node_size(get1(1, nodes));
  return fold_skip_first(
    nodes,
    singleton(first_size),
    (sizes, node) => {
      let size = get1(length2(sizes), sizes) + node_size(node);
      return append4(sizes, size);
    }
  );
}
function unbalanced(_, nodes) {
  let sizes = compute_sizes(nodes);
  return new Unbalanced(sizes, nodes);
}
function wrap(item) {
  return new Array2(0, new Leaf(singleton(item)));
}
function builder_new() {
  return new Builder(toList([]), empty());
}
function length3(array4) {
  if (array4 instanceof Empty2) {
    return 0;
  } else {
    let root = array4.root;
    return node_size(root);
  }
}
function find_size(loop$sizes, loop$size_idx_plus_one, loop$index) {
  while (true) {
    let sizes = loop$sizes;
    let size_idx_plus_one = loop$size_idx_plus_one;
    let index3 = loop$index;
    let $ = get1(size_idx_plus_one, sizes) > index3;
    if ($) {
      return size_idx_plus_one - 1;
    } else {
      loop$sizes = sizes;
      loop$size_idx_plus_one = size_idx_plus_one + 1;
      loop$index = index3;
    }
  }
}
function node_find_map(node, fun) {
  if (node instanceof Leaf) {
    let children2 = node.children;
    return find_map(children2, fun);
  } else if (node instanceof Balanced) {
    let children2 = node.children;
    return find_map(
      children2,
      (_capture) => {
        return node_find_map(_capture, fun);
      }
    );
  } else {
    let children2 = node.children;
    return find_map(
      children2,
      (_capture) => {
        return node_find_map(_capture, fun);
      }
    );
  }
}
function find_map2(array4, is_desired) {
  if (array4 instanceof Empty2) {
    return new Error(void 0);
  } else {
    let root = array4.root;
    return node_find_map(root, is_desired);
  }
}
function find2(array4, is_desired) {
  return find_map2(
    array4,
    (item) => {
      let $ = is_desired(item);
      if ($) {
        return new Ok(item);
      } else {
        return new Error(void 0);
      }
    }
  );
}
function fold_node(node, state, fun) {
  if (node instanceof Balanced) {
    let children2 = node.children;
    return fold3(
      children2,
      state,
      (state2, node2) => {
        return fold_node(node2, state2, fun);
      }
    );
  } else if (node instanceof Unbalanced) {
    let children2 = node.children;
    return fold3(
      children2,
      state,
      (state2, node2) => {
        return fold_node(node2, state2, fun);
      }
    );
  } else {
    let children2 = node.children;
    return fold3(children2, state, fun);
  }
}
function fold5(array4, state, fun) {
  if (array4 instanceof Empty2) {
    return state;
  } else {
    let root = array4.root;
    return fold_node(root, state, fun);
  }
}
function fold_right_node(node, state, fun) {
  if (node instanceof Balanced) {
    let children2 = node.children;
    return fold_right(
      children2,
      state,
      (state2, node2) => {
        return fold_right_node(node2, state2, fun);
      }
    );
  } else if (node instanceof Unbalanced) {
    let children2 = node.children;
    return fold_right(
      children2,
      state,
      (state2, node2) => {
        return fold_right_node(node2, state2, fun);
      }
    );
  } else {
    let children2 = node.children;
    return fold_right(children2, state, fun);
  }
}
function fold_right2(array4, state, fun) {
  if (array4 instanceof Empty2) {
    return state;
  } else {
    let root = array4.root;
    return fold_right_node(root, state, fun);
  }
}
function to_list(array4) {
  return fold_right2(array4, toList([]), prepend2);
}
function balanced(shift, nodes) {
  let len = length2(nodes);
  let last_child = get1(len, nodes);
  let max_size = bsl(1, shift);
  let size = max_size * (len - 1) + node_size(last_child);
  return new Balanced(size, nodes);
}
function branch(shift, nodes) {
  let len = length2(nodes);
  let max_size = bsl(1, shift);
  let sizes = compute_sizes(nodes);
  let prefix_size = (() => {
    if (len === 1) {
      return 0;
    } else {
      return get1(len - 1, sizes);
    }
  })();
  let is_balanced = prefix_size === max_size * (len - 1);
  if (is_balanced) {
    let size = get1(len, sizes);
    return new Balanced(size, nodes);
  } else {
    return new Unbalanced(sizes, nodes);
  }
}
var branch_bits = 5;
function array(shift, nodes) {
  let $ = length2(nodes);
  if ($ === 0) {
    return new Empty2();
  } else if ($ === 1) {
    return new Array2(shift, get1(1, nodes));
  } else {
    let shift$1 = shift + branch_bits;
    return new Array2(shift$1, branch(shift$1, nodes));
  }
}
function get_from_node(loop$node, loop$shift, loop$index) {
  while (true) {
    let node = loop$node;
    let shift = loop$shift;
    let index3 = loop$index;
    if (node instanceof Balanced) {
      let children2 = node.children;
      let node_index = bsr(index3, shift);
      let index$1 = index3 - bsl(node_index, shift);
      let child = get1(node_index + 1, children2);
      loop$node = child;
      loop$shift = shift - branch_bits;
      loop$index = index$1;
    } else if (node instanceof Unbalanced) {
      let sizes = node.sizes;
      let children2 = node.children;
      let start_search_index = bsr(index3, shift);
      let node_index = find_size(sizes, start_search_index + 1, index3);
      let index$1 = (() => {
        if (node_index === 0) {
          return index3;
        } else {
          return index3 - get1(node_index, sizes);
        }
      })();
      let child = get1(node_index + 1, children2);
      loop$node = child;
      loop$shift = shift - branch_bits;
      loop$index = index$1;
    } else {
      let children2 = node.children;
      return get1(index3 + 1, children2);
    }
  }
}
function get(array4, index3) {
  if (array4 instanceof Array2) {
    let shift = array4.shift;
    let root = array4.root;
    let $ = 0 <= index3 && index3 < node_size(root);
    if ($) {
      return new Ok(get_from_node(root, shift, index3));
    } else {
      return new Error(void 0);
    }
  } else {
    return new Error(void 0);
  }
}
function update_node(shift, node, index3, fun) {
  if (node instanceof Balanced) {
    let size = node.size;
    let children2 = node.children;
    let node_index = bsr(index3, shift);
    let index$1 = index3 - bsl(node_index, shift);
    let new_children = (() => {
      let _pipe = get1(node_index + 1, children2);
      let _pipe$1 = ((_capture) => {
        return update_node(shift - branch_bits, _capture, index$1, fun);
      })(_pipe);
      return ((_capture) => {
        return set1(node_index + 1, children2, _capture);
      })(_pipe$1);
    })();
    return new Balanced(size, new_children);
  } else if (node instanceof Unbalanced) {
    let sizes = node.sizes;
    let children2 = node.children;
    let start_search_index = bsr(index3, shift);
    let node_index = find_size(sizes, start_search_index + 1, index3);
    let index$1 = (() => {
      if (node_index === 0) {
        return index3;
      } else {
        return index3 - get1(node_index, sizes);
      }
    })();
    let new_children = (() => {
      let _pipe = get1(node_index + 1, children2);
      let _pipe$1 = ((_capture) => {
        return update_node(shift - branch_bits, _capture, index$1, fun);
      })(_pipe);
      return ((_capture) => {
        return set1(node_index + 1, children2, _capture);
      })(_pipe$1);
    })();
    return new Unbalanced(sizes, new_children);
  } else {
    let children2 = node.children;
    let new_children = set1(
      index3 + 1,
      children2,
      fun(get1(index3 + 1, children2))
    );
    return new Leaf(new_children);
  }
}
function try_update(array4, index3, fun) {
  if (array4 instanceof Array2) {
    let shift = array4.shift;
    let root = array4.root;
    let $ = 0 <= index3 && index3 < node_size(root);
    if ($) {
      return new Array2(shift, update_node(shift, root, index3, fun));
    } else {
      return array4;
    }
  } else {
    return array4;
  }
}
function try_set(array4, index3, item) {
  return try_update(array4, index3, (_) => {
    return item;
  });
}
var branch_factor = 32;
function push_node(nodes, node, shift) {
  if (nodes.hasLength(0)) {
    return toList([singleton(node)]);
  } else {
    let nodes$1 = nodes.head;
    let rest$1 = nodes.tail;
    let $ = length2(nodes$1) < branch_factor;
    if ($) {
      return prepend(append4(nodes$1, node), rest$1);
    } else {
      let shift$1 = shift + branch_bits;
      let new_node = balanced(shift$1, nodes$1);
      return prepend(
        singleton(node),
        push_node(rest$1, new_node, shift$1)
      );
    }
  }
}
function builder_append(builder, item) {
  let nodes = builder.nodes;
  let items = builder.items;
  let $ = length2(items) === branch_factor;
  if ($) {
    let leaf = new Leaf(items);
    return new Builder(push_node(nodes, leaf, 0), singleton(item));
  } else {
    return new Builder(nodes, append4(items, item));
  }
}
function compress_nodes(loop$nodes, loop$shift) {
  while (true) {
    let nodes = loop$nodes;
    let shift = loop$shift;
    if (nodes.hasLength(0)) {
      return new Empty2();
    } else if (nodes.hasLength(1)) {
      let root = nodes.head;
      return array(shift, root);
    } else {
      let nodes$1 = nodes.head;
      let rest$1 = nodes.tail;
      let shift$1 = shift + branch_bits;
      loop$nodes = push_node(rest$1, balanced(shift$1, nodes$1), shift$1);
      loop$shift = shift$1;
    }
  }
}
function builder_to_array(builder) {
  let nodes = builder.nodes;
  let items = builder.items;
  let items_len = length2(items);
  let $ = items_len === 0 && is_empty(nodes);
  if ($) {
    return new Empty2();
  } else {
    let nodes$1 = (() => {
      let $1 = items_len > 0;
      if ($1) {
        return push_node(nodes, new Leaf(items), 0);
      } else {
        return nodes;
      }
    })();
    return compress_nodes(nodes$1, 0);
  }
}
function from_list2(list2) {
  let _pipe = list2;
  let _pipe$1 = fold(_pipe, builder_new(), builder_append);
  return builder_to_array(_pipe$1);
}
function initialise_loop(loop$idx, loop$length, loop$builder, loop$fun) {
  while (true) {
    let idx = loop$idx;
    let length4 = loop$length;
    let builder = loop$builder;
    let fun = loop$fun;
    let $ = idx < length4;
    if ($) {
      loop$idx = idx + 1;
      loop$length = length4;
      loop$builder = builder_append(builder, fun(idx));
      loop$fun = fun;
    } else {
      return builder_to_array(builder);
    }
  }
}
function initialise(length4, fun) {
  return initialise_loop(0, length4, builder_new(), fun);
}
function repeat2(item, times) {
  return initialise(times, (_) => {
    return item;
  });
}
function range(start3, stop) {
  let $ = start3 <= stop;
  if ($) {
    return initialise(stop - start3 + 1, (x) => {
      return x + start3;
    });
  } else {
    return initialise(start3 - stop + 1, (x) => {
      return start3 - x;
    });
  }
}
function filter(array4, predicate) {
  return builder_to_array(
    fold5(
      array4,
      builder_new(),
      (builder, item) => {
        let $ = predicate(item);
        if ($) {
          return builder_append(builder, item);
        } else {
          return builder;
        }
      }
    )
  );
}
function direct_append_balanced(left_shift, left, left_children, right_shift, right) {
  let left_len = length2(left_children);
  let left_last = get1(left_len, left_children);
  let $ = direct_concat_node(
    left_shift - branch_bits,
    left_last,
    right_shift,
    right
  );
  if ($ instanceof Concatenated) {
    let updated = $.merged;
    let children2 = set1(left_len, left_children, updated);
    return new Concatenated(balanced(left_shift, children2));
  } else if ($ instanceof NoFreeSlot && left_len < 32) {
    let node = $.right;
    let children2 = append4(left_children, node);
    let $1 = node_size(left_last) === bsl(1, left_shift);
    if ($1) {
      return new Concatenated(balanced(left_shift, children2));
    } else {
      return new Concatenated(unbalanced(left_shift, children2));
    }
  } else {
    let node = $.right;
    return new NoFreeSlot(left, balanced(left_shift, singleton(node)));
  }
}
function direct_concat_node(left_shift, left, right_shift, right) {
  if (left instanceof Balanced && right instanceof Leaf) {
    let cl = left.children;
    return direct_append_balanced(left_shift, left, cl, right_shift, right);
  } else if (left instanceof Unbalanced && right instanceof Leaf) {
    let sizes = left.sizes;
    let cl = left.children;
    return direct_append_unbalanced(
      left_shift,
      left,
      cl,
      sizes,
      right_shift,
      right
    );
  } else if (left instanceof Leaf && right instanceof Balanced) {
    let cr = right.children;
    return direct_prepend_balanced(left_shift, left, right_shift, right, cr);
  } else if (left instanceof Leaf && right instanceof Unbalanced) {
    let sr = right.sizes;
    let cr = right.children;
    return direct_prepend_unbalanced(
      left_shift,
      left,
      right_shift,
      right,
      cr,
      sr
    );
  } else if (left instanceof Leaf && right instanceof Leaf) {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      return new Concatenated(new Leaf(concat2(cl, cr)));
    } else {
      return new NoFreeSlot(left, right);
    }
  } else if (left instanceof Balanced && left_shift > right_shift) {
    let cl = left.children;
    return direct_append_balanced(left_shift, left, cl, right_shift, right);
  } else if (left instanceof Unbalanced && left_shift > right_shift) {
    let sizes = left.sizes;
    let cl = left.children;
    return direct_append_unbalanced(
      left_shift,
      left,
      cl,
      sizes,
      right_shift,
      right
    );
  } else if (right instanceof Balanced && right_shift > left_shift) {
    let cr = right.children;
    return direct_prepend_balanced(left_shift, left, right_shift, right, cr);
  } else if (right instanceof Unbalanced && right_shift > left_shift) {
    let sr = right.sizes;
    let cr = right.children;
    return direct_prepend_unbalanced(
      left_shift,
      left,
      right_shift,
      right,
      cr,
      sr
    );
  } else if (left instanceof Balanced && right instanceof Balanced) {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      let merged = concat2(cl, cr);
      let left_last = get1(length2(cl), cl);
      let $1 = node_size(left_last) === bsl(1, left_shift);
      if ($1) {
        return new Concatenated(balanced(left_shift, merged));
      } else {
        return new Concatenated(unbalanced(left_shift, merged));
      }
    } else {
      return new NoFreeSlot(left, right);
    }
  } else if (left instanceof Balanced && right instanceof Unbalanced) {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      let merged = concat2(cl, cr);
      return new Concatenated(unbalanced(left_shift, merged));
    } else {
      return new NoFreeSlot(left, right);
    }
  } else if (left instanceof Unbalanced && right instanceof Balanced) {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      let merged = concat2(cl, cr);
      return new Concatenated(unbalanced(left_shift, merged));
    } else {
      return new NoFreeSlot(left, right);
    }
  } else {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      let merged = concat2(cl, cr);
      return new Concatenated(unbalanced(left_shift, merged));
    } else {
      return new NoFreeSlot(left, right);
    }
  }
}
function direct_concat(left, right) {
  if (left instanceof Empty2) {
    return right;
  } else if (right instanceof Empty2) {
    return left;
  } else {
    let left_shift = left.shift;
    let left$1 = left.root;
    let right_shift = right.shift;
    let right$1 = right.root;
    let shift = (() => {
      let $2 = left_shift > right_shift;
      if ($2) {
        return left_shift;
      } else {
        return right_shift;
      }
    })();
    let $ = direct_concat_node(left_shift, left$1, right_shift, right$1);
    if ($ instanceof Concatenated) {
      let root = $.merged;
      return new Array2(shift, root);
    } else {
      let left$2 = $.left;
      let right$2 = $.right;
      return array(shift, pair(left$2, right$2));
    }
  }
}
function prepend4(array4, item) {
  return direct_concat(wrap(item), array4);
}
function direct_append_unbalanced(left_shift, left, left_children, sizes, right_shift, right) {
  let left_len = length2(left_children);
  let left_last = get1(left_len, left_children);
  let $ = direct_concat_node(
    left_shift - branch_bits,
    left_last,
    right_shift,
    right
  );
  if ($ instanceof Concatenated) {
    let updated = $.merged;
    let children2 = set1(left_len, left_children, updated);
    let last_size = get1(left_len, sizes) + node_size(updated);
    let sizes$1 = set1(left_len, sizes, last_size);
    return new Concatenated(new Unbalanced(sizes$1, children2));
  } else if ($ instanceof NoFreeSlot && left_len < 32) {
    let node = $.right;
    let children2 = append4(left_children, node);
    let sizes$1 = append4(
      sizes,
      get1(left_len, sizes) + node_size(node)
    );
    return new Concatenated(new Unbalanced(sizes$1, children2));
  } else {
    let node = $.right;
    return new NoFreeSlot(left, balanced(left_shift, singleton(node)));
  }
}
function direct_prepend_balanced(left_shift, left, right_shift, right, right_children) {
  let right_len = length2(right_children);
  let right_first = get1(1, right_children);
  let $ = direct_concat_node(
    left_shift,
    left,
    right_shift - branch_bits,
    right_first
  );
  if ($ instanceof Concatenated) {
    let updated = $.merged;
    let children2 = set1(1, right_children, updated);
    return new Concatenated(unbalanced(right_shift, children2));
  } else if ($ instanceof NoFreeSlot && right_len < 32) {
    let node = $.left;
    let children2 = prepend3(right_children, node);
    return new Concatenated(unbalanced(right_shift, children2));
  } else {
    let node = $.left;
    return new NoFreeSlot(balanced(right_shift, singleton(node)), right);
  }
}
function direct_prepend_unbalanced(left_shift, left, right_shift, right, right_children, sizes) {
  let right_len = length2(right_children);
  let right_first = get1(1, right_children);
  let $ = direct_concat_node(
    left_shift,
    left,
    right_shift - branch_bits,
    right_first
  );
  if ($ instanceof Concatenated) {
    let updated = $.merged;
    let children2 = set1(1, right_children, updated);
    let size_delta = node_size(updated) - node_size(right_first);
    let sizes$1 = map3(sizes, (s) => {
      return s + size_delta;
    });
    return new Concatenated(new Unbalanced(sizes$1, children2));
  } else if ($ instanceof NoFreeSlot && right_len < 32) {
    let node = $.left;
    let children2 = prepend3(right_children, node);
    let size = node_size(node);
    let sizes$1 = (() => {
      let _pipe = sizes;
      let _pipe$1 = map3(_pipe, (s) => {
        return s + size;
      });
      return prepend3(_pipe$1, size);
    })();
    return new Concatenated(new Unbalanced(sizes$1, children2));
  } else {
    let node = $.left;
    return new NoFreeSlot(balanced(right_shift, singleton(node)), right);
  }
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(all2) {
    super();
    this.all = all2;
  }
};
function custom(run2) {
  return new Effect(
    toList([
      (actions) => {
        return run2(actions.dispatch, actions.emit, actions.select, actions.root);
      }
    ])
  );
}
function from(effect) {
  return custom((dispatch, _, _1, _2) => {
    return effect(dispatch);
  });
}
function none() {
  return new Effect(toList([]));
}
function batch(effects) {
  return new Effect(
    fold(
      effects,
      toList([]),
      (b, _use1) => {
        let a = _use1.all;
        return append(b, a);
      }
    )
  );
}

// build/dev/javascript/lustre/lustre/internals/vdom.mjs
var Text = class extends CustomType {
  constructor(content) {
    super();
    this.content = content;
  }
};
var Element = class extends CustomType {
  constructor(key, namespace, tag, attrs, children2, self_closing, void$) {
    super();
    this.key = key;
    this.namespace = namespace;
    this.tag = tag;
    this.attrs = attrs;
    this.children = children2;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Map2 = class extends CustomType {
  constructor(subtree) {
    super();
    this.subtree = subtree;
  }
};
var Attribute = class extends CustomType {
  constructor(x0, x1, as_property) {
    super();
    this[0] = x0;
    this[1] = x1;
    this.as_property = as_property;
  }
};
var Event = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function attribute_to_event_handler(attribute2) {
  if (attribute2 instanceof Attribute) {
    return new Error(void 0);
  } else {
    let name = attribute2[0];
    let handler = attribute2[1];
    let name$1 = drop_start(name, 2);
    return new Ok([name$1, handler]);
  }
}
function do_element_list_handlers(elements2, handlers2, key) {
  return index_fold(
    elements2,
    handlers2,
    (handlers3, element2, index3) => {
      let key$1 = key + "-" + to_string(index3);
      return do_handlers(element2, handlers3, key$1);
    }
  );
}
function do_handlers(loop$element, loop$handlers, loop$key) {
  while (true) {
    let element2 = loop$element;
    let handlers2 = loop$handlers;
    let key = loop$key;
    if (element2 instanceof Text) {
      return handlers2;
    } else if (element2 instanceof Map2) {
      let subtree = element2.subtree;
      loop$element = subtree();
      loop$handlers = handlers2;
      loop$key = key;
    } else {
      let attrs = element2.attrs;
      let children2 = element2.children;
      let handlers$1 = fold(
        attrs,
        handlers2,
        (handlers3, attr) => {
          let $ = attribute_to_event_handler(attr);
          if ($.isOk()) {
            let name = $[0][0];
            let handler = $[0][1];
            return insert(handlers3, key + "-" + name, handler);
          } else {
            return handlers3;
          }
        }
      );
      return do_element_list_handlers(children2, handlers$1, key);
    }
  }
}
function handlers(element2) {
  return do_handlers(element2, new_map(), "0");
}

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute(name, value) {
  return new Attribute(name, identity(value), false);
}
function property(name, value) {
  return new Attribute(name, identity(value), true);
}
function on(name, handler) {
  return new Event("on" + name, handler);
}
function style(properties) {
  return attribute(
    "style",
    fold(
      properties,
      "",
      (styles, _use1) => {
        let name$1 = _use1[0];
        let value$1 = _use1[1];
        return styles + name$1 + ":" + value$1 + ";";
      }
    )
  );
}
function height(val) {
  return property("height", val);
}
function width(val) {
  return property("width", val);
}

// build/dev/javascript/lustre/lustre/element.mjs
function element(tag, attrs, children2) {
  if (tag === "area") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "base") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "br") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "col") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "embed") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "hr") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "img") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "input") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "link") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "meta") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "param") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "source") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "track") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "wbr") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else {
    return new Element("", "", tag, attrs, children2, false, false);
  }
}

// build/dev/javascript/gleam_stdlib/gleam/set.mjs
var Set2 = class extends CustomType {
  constructor(dict2) {
    super();
    this.dict = dict2;
  }
};
function new$2() {
  return new Set2(new_map());
}

// build/dev/javascript/lustre/lustre/internals/patch.mjs
var Diff = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Emit = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Init = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function is_empty_element_diff(diff2) {
  return isEqual(diff2.created, new_map()) && isEqual(
    diff2.removed,
    new$2()
  ) && isEqual(diff2.updated, new_map());
}

// build/dev/javascript/lustre/lustre/internals/runtime.mjs
var Attrs = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Batch = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Debug = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Dispatch = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Emit2 = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Event2 = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Shutdown = class extends CustomType {
};
var Subscribe = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Unsubscribe = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ForceModel = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};

// build/dev/javascript/lustre/vdom.ffi.mjs
if (globalThis.customElements && !globalThis.customElements.get("lustre-fragment")) {
  globalThis.customElements.define(
    "lustre-fragment",
    class LustreFragment extends HTMLElement {
      constructor() {
        super();
      }
    }
  );
}
function morph(prev, next, dispatch) {
  let out;
  let stack = [{ prev, next, parent: prev.parentNode }];
  while (stack.length) {
    let { prev: prev2, next: next2, parent } = stack.pop();
    while (next2.subtree !== void 0)
      next2 = next2.subtree();
    if (next2.content !== void 0) {
      if (!prev2) {
        const created = document.createTextNode(next2.content);
        parent.appendChild(created);
        out ??= created;
      } else if (prev2.nodeType === Node.TEXT_NODE) {
        if (prev2.textContent !== next2.content)
          prev2.textContent = next2.content;
        out ??= prev2;
      } else {
        const created = document.createTextNode(next2.content);
        parent.replaceChild(created, prev2);
        out ??= created;
      }
    } else if (next2.tag !== void 0) {
      const created = createElementNode({
        prev: prev2,
        next: next2,
        dispatch,
        stack
      });
      if (!prev2) {
        parent.appendChild(created);
      } else if (prev2 !== created) {
        parent.replaceChild(created, prev2);
      }
      out ??= created;
    }
  }
  return out;
}
function createElementNode({ prev, next, dispatch, stack }) {
  const namespace = next.namespace || "http://www.w3.org/1999/xhtml";
  const canMorph = prev && prev.nodeType === Node.ELEMENT_NODE && prev.localName === next.tag && prev.namespaceURI === (next.namespace || "http://www.w3.org/1999/xhtml");
  const el = canMorph ? prev : namespace ? document.createElementNS(namespace, next.tag) : document.createElement(next.tag);
  let handlersForEl;
  if (!registeredHandlers.has(el)) {
    const emptyHandlers = /* @__PURE__ */ new Map();
    registeredHandlers.set(el, emptyHandlers);
    handlersForEl = emptyHandlers;
  } else {
    handlersForEl = registeredHandlers.get(el);
  }
  const prevHandlers = canMorph ? new Set(handlersForEl.keys()) : null;
  const prevAttributes = canMorph ? new Set(Array.from(prev.attributes, (a) => a.name)) : null;
  let className = null;
  let style2 = null;
  let innerHTML = null;
  if (canMorph && next.tag === "textarea") {
    const innertText = next.children[Symbol.iterator]().next().value?.content;
    if (innertText !== void 0)
      el.value = innertText;
  }
  const delegated = [];
  for (const attr of next.attrs) {
    const name = attr[0];
    const value = attr[1];
    if (attr.as_property) {
      if (el[name] !== value)
        el[name] = value;
      if (canMorph)
        prevAttributes.delete(name);
    } else if (name.startsWith("on")) {
      const eventName = name.slice(2);
      const callback = dispatch(value, eventName === "input");
      if (!handlersForEl.has(eventName)) {
        el.addEventListener(eventName, lustreGenericEventHandler);
      }
      handlersForEl.set(eventName, callback);
      if (canMorph)
        prevHandlers.delete(eventName);
    } else if (name.startsWith("data-lustre-on-")) {
      const eventName = name.slice(15);
      const callback = dispatch(lustreServerEventHandler);
      if (!handlersForEl.has(eventName)) {
        el.addEventListener(eventName, lustreGenericEventHandler);
      }
      handlersForEl.set(eventName, callback);
      el.setAttribute(name, value);
      if (canMorph) {
        prevHandlers.delete(eventName);
        prevAttributes.delete(name);
      }
    } else if (name.startsWith("delegate:data-") || name.startsWith("delegate:aria-")) {
      el.setAttribute(name, value);
      delegated.push([name.slice(10), value]);
    } else if (name === "class") {
      className = className === null ? value : className + " " + value;
    } else if (name === "style") {
      style2 = style2 === null ? value : style2 + value;
    } else if (name === "dangerous-unescaped-html") {
      innerHTML = value;
    } else {
      if (el.getAttribute(name) !== value)
        el.setAttribute(name, value);
      if (name === "value" || name === "selected")
        el[name] = value;
      if (canMorph)
        prevAttributes.delete(name);
    }
  }
  if (className !== null) {
    el.setAttribute("class", className);
    if (canMorph)
      prevAttributes.delete("class");
  }
  if (style2 !== null) {
    el.setAttribute("style", style2);
    if (canMorph)
      prevAttributes.delete("style");
  }
  if (canMorph) {
    for (const attr of prevAttributes) {
      el.removeAttribute(attr);
    }
    for (const eventName of prevHandlers) {
      handlersForEl.delete(eventName);
      el.removeEventListener(eventName, lustreGenericEventHandler);
    }
  }
  if (next.tag === "slot") {
    window.queueMicrotask(() => {
      for (const child of el.assignedElements()) {
        for (const [name, value] of delegated) {
          if (!child.hasAttribute(name)) {
            child.setAttribute(name, value);
          }
        }
      }
    });
  }
  if (next.key !== void 0 && next.key !== "") {
    el.setAttribute("data-lustre-key", next.key);
  } else if (innerHTML !== null) {
    el.innerHTML = innerHTML;
    return el;
  }
  let prevChild = el.firstChild;
  let seenKeys = null;
  let keyedChildren = null;
  let incomingKeyedChildren = null;
  let firstChild = children(next).next().value;
  if (canMorph && firstChild !== void 0 && // Explicit checks are more verbose but truthy checks force a bunch of comparisons
  // we don't care about: it's never gonna be a number etc.
  firstChild.key !== void 0 && firstChild.key !== "") {
    seenKeys = /* @__PURE__ */ new Set();
    keyedChildren = getKeyedChildren(prev);
    incomingKeyedChildren = getKeyedChildren(next);
    for (const child of children(next)) {
      prevChild = diffKeyedChild(
        prevChild,
        child,
        el,
        stack,
        incomingKeyedChildren,
        keyedChildren,
        seenKeys
      );
    }
  } else {
    for (const child of children(next)) {
      stack.unshift({ prev: prevChild, next: child, parent: el });
      prevChild = prevChild?.nextSibling;
    }
  }
  while (prevChild) {
    const next2 = prevChild.nextSibling;
    el.removeChild(prevChild);
    prevChild = next2;
  }
  return el;
}
var registeredHandlers = /* @__PURE__ */ new WeakMap();
function lustreGenericEventHandler(event2) {
  const target = event2.currentTarget;
  if (!registeredHandlers.has(target)) {
    target.removeEventListener(event2.type, lustreGenericEventHandler);
    return;
  }
  const handlersForEventTarget = registeredHandlers.get(target);
  if (!handlersForEventTarget.has(event2.type)) {
    target.removeEventListener(event2.type, lustreGenericEventHandler);
    return;
  }
  handlersForEventTarget.get(event2.type)(event2);
}
function lustreServerEventHandler(event2) {
  const el = event2.currentTarget;
  const tag = el.getAttribute(`data-lustre-on-${event2.type}`);
  const data = JSON.parse(el.getAttribute("data-lustre-data") || "{}");
  const include = JSON.parse(el.getAttribute("data-lustre-include") || "[]");
  switch (event2.type) {
    case "input":
    case "change":
      include.push("target.value");
      break;
  }
  return {
    tag,
    data: include.reduce(
      (data2, property2) => {
        const path = property2.split(".");
        for (let i = 0, o = data2, e = event2; i < path.length; i++) {
          if (i === path.length - 1) {
            o[path[i]] = e[path[i]];
          } else {
            o[path[i]] ??= {};
            e = e[path[i]];
            o = o[path[i]];
          }
        }
        return data2;
      },
      { data }
    )
  };
}
function getKeyedChildren(el) {
  const keyedChildren = /* @__PURE__ */ new Map();
  if (el) {
    for (const child of children(el)) {
      const key = child?.key || child?.getAttribute?.("data-lustre-key");
      if (key)
        keyedChildren.set(key, child);
    }
  }
  return keyedChildren;
}
function diffKeyedChild(prevChild, child, el, stack, incomingKeyedChildren, keyedChildren, seenKeys) {
  while (prevChild && !incomingKeyedChildren.has(prevChild.getAttribute("data-lustre-key"))) {
    const nextChild = prevChild.nextSibling;
    el.removeChild(prevChild);
    prevChild = nextChild;
  }
  if (keyedChildren.size === 0) {
    stack.unshift({ prev: prevChild, next: child, parent: el });
    prevChild = prevChild?.nextSibling;
    return prevChild;
  }
  if (seenKeys.has(child.key)) {
    console.warn(`Duplicate key found in Lustre vnode: ${child.key}`);
    stack.unshift({ prev: null, next: child, parent: el });
    return prevChild;
  }
  seenKeys.add(child.key);
  const keyedChild = keyedChildren.get(child.key);
  if (!keyedChild && !prevChild) {
    stack.unshift({ prev: null, next: child, parent: el });
    return prevChild;
  }
  if (!keyedChild && prevChild !== null) {
    const placeholder = document.createTextNode("");
    el.insertBefore(placeholder, prevChild);
    stack.unshift({ prev: placeholder, next: child, parent: el });
    return prevChild;
  }
  if (!keyedChild || keyedChild === prevChild) {
    stack.unshift({ prev: prevChild, next: child, parent: el });
    prevChild = prevChild?.nextSibling;
    return prevChild;
  }
  el.insertBefore(keyedChild, prevChild);
  stack.unshift({ prev: keyedChild, next: child, parent: el });
  return prevChild;
}
function* children(element2) {
  for (const child of element2.children) {
    yield* forceChild(child);
  }
}
function* forceChild(element2) {
  if (element2.subtree !== void 0) {
    yield* forceChild(element2.subtree());
  } else {
    yield element2;
  }
}

// build/dev/javascript/lustre/lustre.ffi.mjs
var LustreClientApplication = class _LustreClientApplication {
  /**
   * @template Flags
   *
   * @param {object} app
   * @param {(flags: Flags) => [Model, Lustre.Effect<Msg>]} app.init
   * @param {(msg: Msg, model: Model) => [Model, Lustre.Effect<Msg>]} app.update
   * @param {(model: Model) => Lustre.Element<Msg>} app.view
   * @param {string | HTMLElement} selector
   * @param {Flags} flags
   *
   * @returns {Gleam.Ok<(action: Lustre.Action<Lustre.Client, Msg>>) => void>}
   */
  static start({ init: init3, update: update2, view: view2 }, selector, flags) {
    if (!is_browser())
      return new Error(new NotABrowser());
    const root = selector instanceof HTMLElement ? selector : document.querySelector(selector);
    if (!root)
      return new Error(new ElementNotFound(selector));
    const app = new _LustreClientApplication(root, init3(flags), update2, view2);
    return new Ok((action) => app.send(action));
  }
  /**
   * @param {Element} root
   * @param {[Model, Lustre.Effect<Msg>]} init
   * @param {(model: Model, msg: Msg) => [Model, Lustre.Effect<Msg>]} update
   * @param {(model: Model) => Lustre.Element<Msg>} view
   *
   * @returns {LustreClientApplication}
   */
  constructor(root, [init3, effects], update2, view2) {
    this.root = root;
    this.#model = init3;
    this.#update = update2;
    this.#view = view2;
    this.#tickScheduled = window.setTimeout(
      () => this.#tick(effects.all.toArray(), true),
      0
    );
  }
  /** @type {Element} */
  root;
  /**
   * @param {Lustre.Action<Lustre.Client, Msg>} action
   *
   * @returns {void}
   */
  send(action) {
    if (action instanceof Debug) {
      if (action[0] instanceof ForceModel) {
        this.#tickScheduled = window.clearTimeout(this.#tickScheduled);
        this.#queue = [];
        this.#model = action[0][0];
        const vdom = this.#view(this.#model);
        const dispatch = (handler, immediate = false) => (event2) => {
          const result = handler(event2);
          if (result instanceof Ok) {
            this.send(new Dispatch(result[0], immediate));
          }
        };
        const prev = this.root.firstChild ?? this.root.appendChild(document.createTextNode(""));
        morph(prev, vdom, dispatch);
      }
    } else if (action instanceof Dispatch) {
      const msg = action[0];
      const immediate = action[1] ?? false;
      this.#queue.push(msg);
      if (immediate) {
        this.#tickScheduled = window.clearTimeout(this.#tickScheduled);
        this.#tick();
      } else if (!this.#tickScheduled) {
        this.#tickScheduled = window.setTimeout(() => this.#tick());
      }
    } else if (action instanceof Emit2) {
      const event2 = action[0];
      const data = action[1];
      this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
    } else if (action instanceof Shutdown) {
      this.#tickScheduled = window.clearTimeout(this.#tickScheduled);
      this.#model = null;
      this.#update = null;
      this.#view = null;
      this.#queue = null;
      while (this.root.firstChild) {
        this.root.firstChild.remove();
      }
    }
  }
  /** @type {Model} */
  #model;
  /** @type {(model: Model, msg: Msg) => [Model, Lustre.Effect<Msg>]} */
  #update;
  /** @type {(model: Model) => Lustre.Element<Msg>} */
  #view;
  /** @type {Array<Msg>} */
  #queue = [];
  /** @type {number | undefined} */
  #tickScheduled;
  /**
   * @param {Lustre.Effect<Msg>[]} effects
   */
  #tick(effects = []) {
    this.#tickScheduled = void 0;
    this.#flush(effects);
    const vdom = this.#view(this.#model);
    const dispatch = (handler, immediate = false) => (event2) => {
      const result = handler(event2);
      if (result instanceof Ok) {
        this.send(new Dispatch(result[0], immediate));
      }
    };
    const prev = this.root.firstChild ?? this.root.appendChild(document.createTextNode(""));
    morph(prev, vdom, dispatch);
  }
  #flush(effects = []) {
    while (this.#queue.length > 0) {
      const msg = this.#queue.shift();
      const [next, effect] = this.#update(this.#model, msg);
      effects = effects.concat(effect.all.toArray());
      this.#model = next;
    }
    while (effects.length > 0) {
      const effect = effects.shift();
      const dispatch = (msg) => this.send(new Dispatch(msg));
      const emit2 = (event2, data) => this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
      const select = () => {
      };
      const root = this.root;
      effect({ dispatch, emit: emit2, select, root });
    }
    if (this.#queue.length > 0) {
      this.#flush(effects);
    }
  }
};
var start = LustreClientApplication.start;
var LustreServerApplication = class _LustreServerApplication {
  static start({ init: init3, update: update2, view: view2, on_attribute_change }, flags) {
    const app = new _LustreServerApplication(
      init3(flags),
      update2,
      view2,
      on_attribute_change
    );
    return new Ok((action) => app.send(action));
  }
  constructor([model, effects], update2, view2, on_attribute_change) {
    this.#model = model;
    this.#update = update2;
    this.#view = view2;
    this.#html = view2(model);
    this.#onAttributeChange = on_attribute_change;
    this.#renderers = /* @__PURE__ */ new Map();
    this.#handlers = handlers(this.#html);
    this.#tick(effects.all.toArray());
  }
  send(action) {
    if (action instanceof Attrs) {
      for (const attr of action[0]) {
        const decoder = this.#onAttributeChange.get(attr[0]);
        if (!decoder)
          continue;
        const msg = decoder(attr[1]);
        if (msg instanceof Error)
          continue;
        this.#queue.push(msg);
      }
      this.#tick();
    } else if (action instanceof Batch) {
      this.#queue = this.#queue.concat(action[0].toArray());
      this.#tick(action[1].all.toArray());
    } else if (action instanceof Debug) {
    } else if (action instanceof Dispatch) {
      this.#queue.push(action[0]);
      this.#tick();
    } else if (action instanceof Emit2) {
      const event2 = new Emit(action[0], action[1]);
      for (const [_, renderer] of this.#renderers) {
        renderer(event2);
      }
    } else if (action instanceof Event2) {
      const handler = this.#handlers.get(action[0]);
      if (!handler)
        return;
      const msg = handler(action[1]);
      if (msg instanceof Error)
        return;
      this.#queue.push(msg[0]);
      this.#tick();
    } else if (action instanceof Subscribe) {
      const attrs = keys(this.#onAttributeChange);
      const patch = new Init(attrs, this.#html);
      this.#renderers = this.#renderers.set(action[0], action[1]);
      action[1](patch);
    } else if (action instanceof Unsubscribe) {
      this.#renderers = this.#renderers.delete(action[0]);
    }
  }
  #model;
  #update;
  #queue;
  #view;
  #html;
  #renderers;
  #handlers;
  #onAttributeChange;
  #tick(effects = []) {
    this.#flush(effects);
    const vdom = this.#view(this.#model);
    const diff2 = elements(this.#html, vdom);
    if (!is_empty_element_diff(diff2)) {
      const patch = new Diff(diff2);
      for (const [_, renderer] of this.#renderers) {
        renderer(patch);
      }
    }
    this.#html = vdom;
    this.#handlers = diff2.handlers;
  }
  #flush(effects = []) {
    while (this.#queue.length > 0) {
      const msg = this.#queue.shift();
      const [next, effect] = this.#update(this.#model, msg);
      effects = effects.concat(effect.all.toArray());
      this.#model = next;
    }
    while (effects.length > 0) {
      const effect = effects.shift();
      const dispatch = (msg) => this.send(new Dispatch(msg));
      const emit2 = (event2, data) => this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
      const select = () => {
      };
      const root = null;
      effect({ dispatch, emit: emit2, select, root });
    }
    if (this.#queue.length > 0) {
      this.#flush(effects);
    }
  }
};
var start_server_application = LustreServerApplication.start;
var is_browser = () => globalThis.window && window.document;

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init3, update2, view2, on_attribute_change) {
    super();
    this.init = init3;
    this.update = update2;
    this.view = view2;
    this.on_attribute_change = on_attribute_change;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init3, update2, view2) {
  return new App(init3, update2, view2, new None());
}
function start2(app, selector, flags) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, flags);
    }
  );
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function div(attrs, children2) {
  return element("div", attrs, children2);
}
function canvas(attrs) {
  return element("canvas", attrs, toList([]));
}

// build/dev/javascript/lustre/lustre/event.mjs
function on2(name, handler) {
  return on(name, handler);
}
function on_keydown(msg) {
  return on2(
    "keydown",
    (event2) => {
      let _pipe = event2;
      let _pipe$1 = field("key", string)(_pipe);
      return map2(_pipe$1, msg);
    }
  );
}
function on_keyup(msg) {
  return on2(
    "keyup",
    (event2) => {
      let _pipe = event2;
      let _pipe$1 = field("key", string)(_pipe);
      return map2(_pipe$1, msg);
    }
  );
}

// build/dev/javascript/gleamness/emulation/types.mjs
var CPU = class extends CustomType {
  constructor(register_a, register_x, register_y, status, program_counter, stack_pointer, memory, bus) {
    super();
    this.register_a = register_a;
    this.register_x = register_x;
    this.register_y = register_y;
    this.status = status;
    this.program_counter = program_counter;
    this.stack_pointer = stack_pointer;
    this.memory = memory;
    this.bus = bus;
  }
};
var Bus = class extends CustomType {
  constructor(cpu_vram) {
    super();
    this.cpu_vram = cpu_vram;
  }
};
var CpuInstruction = class extends CustomType {
  constructor(opcode, mnemonic, bytes, cycles, addressing_mode) {
    super();
    this.opcode = opcode;
    this.mnemonic = mnemonic;
    this.bytes = bytes;
    this.cycles = cycles;
    this.addressing_mode = addressing_mode;
  }
};
var Accumulator = class extends CustomType {
};
var Immediate = class extends CustomType {
};
var ZeroPage = class extends CustomType {
};
var ZeroPageX = class extends CustomType {
};
var ZeroPageY = class extends CustomType {
};
var Absolute = class extends CustomType {
};
var AbsoluteX = class extends CustomType {
};
var AbsoluteY = class extends CustomType {
};
var Indirect = class extends CustomType {
};
var IndirectX = class extends CustomType {
};
var IndirectY = class extends CustomType {
};
var Relative = class extends CustomType {
};
var NoneAddressing = class extends CustomType {
};
var flag_carry = 1;
var flag_zero = 2;
var flag_interrupt_disable = 4;
var flag_decimal_mode = 8;
var flag_unused = 32;
var flag_overflow = 64;
var flag_negative = 128;
var stack_base = 256;
var stack_reset = 255;

// build/dev/javascript/gleamness/emulation/bus.mjs
function mem_read(bus, addr) {
  if (addr >= 0 && addr <= 8191) {
    let addr$1 = addr;
    let mirror_down_addr = bitwise_and(addr$1, 2047);
    let _pipe = get(bus.cpu_vram, mirror_down_addr);
    return replace_error(_pipe, void 0);
  } else if (addr >= 8192 && addr <= 16383) {
    let addr$1 = addr;
    let $ = bitwise_and(addr$1, 8199);
    return new Ok(0);
  } else {
    return new Ok(0);
  }
}
function mem_write(bus, addr, data) {
  if (addr >= 0 && addr <= 8191) {
    let addr$1 = addr;
    let mirror_down_addr = bitwise_and(addr$1, 2047);
    let new_vram = try_set(bus.cpu_vram, mirror_down_addr, data);
    return new Ok(new Bus(new_vram));
  } else if (addr >= 8192 && addr <= 16383) {
    let addr$1 = addr;
    let $ = bitwise_and(addr$1, 8199);
    return new Ok(bus);
  } else {
    return new Ok(bus);
  }
}
function mem_read_u16(bus, addr) {
  let $ = mem_read(bus, addr);
  if ($.isOk()) {
    let lo = $[0];
    let $1 = mem_read(bus, addr + 1);
    if ($1.isOk()) {
      let hi = $1[0];
      return new Ok(bitwise_or(bitwise_shift_left(hi, 8), lo));
    } else {
      return new Error(void 0);
    }
  } else {
    return new Error(void 0);
  }
}
function mem_write_u16(bus, addr, data) {
  let lo = bitwise_and(data, 255);
  let hi = bitwise_shift_right(data, 8);
  let $ = mem_write(bus, addr, lo);
  if ($.isOk()) {
    let new_bus = $[0];
    return mem_write(new_bus, addr + 1, hi);
  } else {
    return new Error(void 0);
  }
}

// build/dev/javascript/gleamness/emulation/memory.mjs
function init_memory() {
  return repeat2(0, 65535);
}
function read(cpu, address) {
  let $ = address < 8192;
  if ($) {
    return mem_read(cpu.bus, address);
  } else {
    let _pipe = get(cpu.memory, address);
    return replace_error(_pipe, void 0);
  }
}
function write(cpu, address, data) {
  let $ = address < 8192;
  if ($) {
    let $1 = mem_write(cpu.bus, address, data);
    if ($1.isOk()) {
      let new_bus = $1[0];
      return new Ok(
        (() => {
          let _record = cpu;
          return new CPU(
            _record.register_a,
            _record.register_x,
            _record.register_y,
            _record.status,
            _record.program_counter,
            _record.stack_pointer,
            _record.memory,
            new_bus
          );
        })()
      );
    } else {
      return new Error(void 0);
    }
  } else {
    let new_memory = try_set(cpu.memory, address, data);
    return new Ok(
      (() => {
        let _record = cpu;
        return new CPU(
          _record.register_a,
          _record.register_x,
          _record.register_y,
          _record.status,
          _record.program_counter,
          _record.stack_pointer,
          new_memory,
          _record.bus
        );
      })()
    );
  }
}
function read_u16(cpu, address) {
  let $ = address < 8192;
  if ($) {
    return mem_read_u16(cpu.bus, address);
  } else {
    let $1 = read(cpu, address);
    if ($1.isOk()) {
      let lo = $1[0];
      let $2 = read(cpu, address + 1);
      if ($2.isOk()) {
        let hi = $2[0];
        return new Ok(bitwise_or(bitwise_shift_left(hi, 8), lo));
      } else {
        return new Error(void 0);
      }
    } else {
      return new Error(void 0);
    }
  }
}
function write_u16(cpu, address, data) {
  let $ = address < 8192;
  if ($) {
    let $1 = mem_write_u16(cpu.bus, address, data);
    if ($1.isOk()) {
      let new_bus = $1[0];
      return new Ok(
        (() => {
          let _record = cpu;
          return new CPU(
            _record.register_a,
            _record.register_x,
            _record.register_y,
            _record.status,
            _record.program_counter,
            _record.stack_pointer,
            _record.memory,
            new_bus
          );
        })()
      );
    } else {
      return new Error(void 0);
    }
  } else {
    let lo = bitwise_and(data, 255);
    let hi = bitwise_shift_right(data, 8);
    let $1 = write(cpu, address, lo);
    if ($1.isOk()) {
      let new_cpu = $1[0];
      return write(new_cpu, address + 1, hi);
    } else {
      return new Error(void 0);
    }
  }
}

// build/dev/javascript/gleamness/emulation/addressing.mjs
function fetch_byte(cpu, program) {
  let _pipe = get(program, cpu.program_counter);
  let _pipe$1 = map2(
    _pipe,
    (byte) => {
      let new_cpu = (() => {
        let _record = cpu;
        return new CPU(
          _record.register_a,
          _record.register_x,
          _record.register_y,
          _record.status,
          cpu.program_counter + 1,
          _record.stack_pointer,
          _record.memory,
          _record.bus
        );
      })();
      return [new_cpu, byte];
    }
  );
  return unwrap(_pipe$1, [cpu, 0]);
}
function fetch_word(cpu, program) {
  let $ = fetch_byte(cpu, program);
  {
    let cpu_after_lo = $[0];
    let lo = $[1];
    let $1 = fetch_byte(cpu_after_lo, program);
    {
      let cpu_after_hi = $1[0];
      let hi = $1[1];
      let word = bitwise_or(bitwise_shift_left(hi, 8), lo);
      return [cpu_after_hi, word];
    }
  }
}
function get_operand_address(cpu, program, mode) {
  if (mode instanceof Immediate) {
    let addr = cpu.program_counter;
    let new_cpu = (() => {
      let _record = cpu;
      return new CPU(
        _record.register_a,
        _record.register_x,
        _record.register_y,
        _record.status,
        cpu.program_counter + 1,
        _record.stack_pointer,
        _record.memory,
        _record.bus
      );
    })();
    return [new_cpu, addr];
  } else if (mode instanceof ZeroPage) {
    let $ = fetch_byte(cpu, program);
    {
      let new_cpu = $[0];
      let addr = $[1];
      return [new_cpu, addr];
    }
  } else if (mode instanceof ZeroPageX) {
    let $ = fetch_byte(cpu, program);
    {
      let new_cpu = $[0];
      let addr = $[1];
      let wrapped_addr = bitwise_and(addr + cpu.register_x, 255);
      return [new_cpu, wrapped_addr];
    }
  } else if (mode instanceof ZeroPageY) {
    let $ = fetch_byte(cpu, program);
    {
      let new_cpu = $[0];
      let addr = $[1];
      let wrapped_addr = bitwise_and(addr + cpu.register_y, 255);
      return [new_cpu, wrapped_addr];
    }
  } else if (mode instanceof Absolute) {
    let $ = fetch_word(cpu, program);
    {
      let new_cpu = $[0];
      let addr = $[1];
      return [new_cpu, addr];
    }
  } else if (mode instanceof AbsoluteX) {
    let $ = fetch_word(cpu, program);
    {
      let new_cpu = $[0];
      let addr = $[1];
      return [new_cpu, addr + cpu.register_x];
    }
  } else if (mode instanceof AbsoluteY) {
    let $ = fetch_word(cpu, program);
    {
      let new_cpu = $[0];
      let addr = $[1];
      return [new_cpu, addr + cpu.register_y];
    }
  } else if (mode instanceof Indirect) {
    let $ = fetch_word(cpu, program);
    {
      let new_cpu = $[0];
      let addr = $[1];
      let lo_byte_addr = addr;
      let hi_byte_addr = (() => {
        let $12 = bitwise_and(addr, 255) === 255;
        if ($12) {
          return addr - 255;
        } else {
          return addr + 1;
        }
      })();
      let $1 = read(new_cpu, lo_byte_addr);
      if ($1.isOk()) {
        let lo = $1[0];
        let $2 = read(new_cpu, hi_byte_addr);
        if ($2.isOk()) {
          let hi = $2[0];
          let final_addr = bitwise_or(bitwise_shift_left(hi, 8), lo);
          return [new_cpu, final_addr];
        } else {
          return [new_cpu, 0];
        }
      } else {
        return [new_cpu, 0];
      }
    }
  } else if (mode instanceof IndirectX) {
    let $ = fetch_byte(cpu, program);
    {
      let new_cpu = $[0];
      let addr = $[1];
      let wrapped_addr = bitwise_and(addr + cpu.register_x, 255);
      let $1 = read(new_cpu, wrapped_addr);
      if ($1.isOk()) {
        let lo = $1[0];
        let $2 = read(new_cpu, bitwise_and(wrapped_addr + 1, 255));
        if ($2.isOk()) {
          let hi = $2[0];
          let final_addr = bitwise_or(bitwise_shift_left(hi, 8), lo);
          return [new_cpu, final_addr];
        } else {
          return [new_cpu, 0];
        }
      } else {
        return [new_cpu, 0];
      }
    }
  } else if (mode instanceof IndirectY) {
    let $ = fetch_byte(cpu, program);
    {
      let new_cpu = $[0];
      let addr = $[1];
      let $1 = read(new_cpu, addr);
      if ($1.isOk()) {
        let lo = $1[0];
        let $2 = read(new_cpu, bitwise_and(addr + 1, 255));
        if ($2.isOk()) {
          let hi = $2[0];
          let base_addr = bitwise_or(bitwise_shift_left(hi, 8), lo);
          let final_addr = base_addr + cpu.register_y;
          return [new_cpu, final_addr];
        } else {
          return [new_cpu, 0];
        }
      } else {
        return [new_cpu, 0];
      }
    }
  } else if (mode instanceof Relative) {
    let $ = fetch_byte(cpu, program);
    {
      let new_cpu = $[0];
      let offset = $[1];
      let signed_offset = (() => {
        let $1 = offset > 127;
        if ($1) {
          return offset - 256;
        } else {
          return offset;
        }
      })();
      let target_addr = new_cpu.program_counter + signed_offset;
      return [new_cpu, target_addr];
    }
  } else if (mode instanceof Accumulator) {
    return [cpu, 0];
  } else {
    return [cpu, 0];
  }
}
function get_operand_value(cpu, program, mode, operand_addr) {
  if (mode instanceof Immediate) {
    let _pipe = get(program, operand_addr);
    return unwrap(_pipe, 0);
  } else if (mode instanceof Accumulator) {
    return cpu.register_a;
  } else if (mode instanceof NoneAddressing) {
    return 0;
  } else {
    let $ = read(cpu, operand_addr);
    if ($.isOk()) {
      let value = $[0];
      return value;
    } else {
      return 0;
    }
  }
}

// build/dev/javascript/gleamness/emulation/helpers/instruction_helpers.mjs
function get_all_instructions() {
  return from_list2(
    toList([
      new CpuInstruction(105, "ADC", 2, 2, new Immediate()),
      new CpuInstruction(101, "ADC", 2, 3, new ZeroPage()),
      new CpuInstruction(117, "ADC", 2, 4, new ZeroPageX()),
      new CpuInstruction(109, "ADC", 3, 4, new Absolute()),
      new CpuInstruction(125, "ADC", 3, 4, new AbsoluteX()),
      new CpuInstruction(121, "ADC", 3, 4, new AbsoluteY()),
      new CpuInstruction(97, "ADC", 2, 6, new IndirectX()),
      new CpuInstruction(113, "ADC", 2, 5, new IndirectY()),
      new CpuInstruction(41, "AND", 2, 2, new Immediate()),
      new CpuInstruction(37, "AND", 2, 3, new ZeroPage()),
      new CpuInstruction(53, "AND", 2, 4, new ZeroPageX()),
      new CpuInstruction(45, "AND", 3, 4, new Absolute()),
      new CpuInstruction(61, "AND", 3, 4, new AbsoluteX()),
      new CpuInstruction(57, "AND", 3, 4, new AbsoluteY()),
      new CpuInstruction(33, "AND", 2, 6, new IndirectX()),
      new CpuInstruction(49, "AND", 2, 5, new IndirectY()),
      new CpuInstruction(10, "ASL", 1, 2, new Accumulator()),
      new CpuInstruction(6, "ASL", 2, 5, new ZeroPage()),
      new CpuInstruction(22, "ASL", 2, 6, new ZeroPageX()),
      new CpuInstruction(14, "ASL", 3, 6, new Absolute()),
      new CpuInstruction(30, "ASL", 3, 7, new AbsoluteX()),
      new CpuInstruction(144, "BCC", 2, 2, new Relative()),
      new CpuInstruction(176, "BCS", 2, 2, new Relative()),
      new CpuInstruction(240, "BEQ", 2, 2, new Relative()),
      new CpuInstruction(36, "BIT", 2, 3, new ZeroPage()),
      new CpuInstruction(44, "BIT", 3, 4, new Absolute()),
      new CpuInstruction(48, "BMI", 2, 2, new Relative()),
      new CpuInstruction(208, "BNE", 2, 2, new Relative()),
      new CpuInstruction(16, "BPL", 2, 2, new Relative()),
      new CpuInstruction(0, "BRK", 1, 7, new NoneAddressing()),
      new CpuInstruction(80, "BVC", 2, 2, new Relative()),
      new CpuInstruction(112, "BVS", 2, 2, new Relative()),
      new CpuInstruction(24, "CLC", 1, 2, new NoneAddressing()),
      new CpuInstruction(216, "CLD", 1, 2, new NoneAddressing()),
      new CpuInstruction(88, "CLI", 1, 2, new NoneAddressing()),
      new CpuInstruction(184, "CLV", 1, 2, new NoneAddressing()),
      new CpuInstruction(201, "CMP", 2, 2, new Immediate()),
      new CpuInstruction(197, "CMP", 2, 3, new ZeroPage()),
      new CpuInstruction(213, "CMP", 2, 4, new ZeroPageX()),
      new CpuInstruction(205, "CMP", 3, 4, new Absolute()),
      new CpuInstruction(221, "CMP", 3, 4, new AbsoluteX()),
      new CpuInstruction(217, "CMP", 3, 4, new AbsoluteY()),
      new CpuInstruction(193, "CMP", 2, 6, new IndirectX()),
      new CpuInstruction(209, "CMP", 2, 5, new IndirectY()),
      new CpuInstruction(224, "CPX", 2, 2, new Immediate()),
      new CpuInstruction(228, "CPX", 2, 3, new ZeroPage()),
      new CpuInstruction(236, "CPX", 3, 4, new Absolute()),
      new CpuInstruction(192, "CPY", 2, 2, new Immediate()),
      new CpuInstruction(196, "CPY", 2, 3, new ZeroPage()),
      new CpuInstruction(204, "CPY", 3, 4, new Absolute()),
      new CpuInstruction(198, "DEC", 2, 5, new ZeroPage()),
      new CpuInstruction(214, "DEC", 2, 6, new ZeroPageX()),
      new CpuInstruction(206, "DEC", 3, 6, new Absolute()),
      new CpuInstruction(222, "DEC", 3, 7, new AbsoluteX()),
      new CpuInstruction(202, "DEX", 1, 2, new NoneAddressing()),
      new CpuInstruction(136, "DEY", 1, 2, new NoneAddressing()),
      new CpuInstruction(73, "EOR", 2, 2, new Immediate()),
      new CpuInstruction(69, "EOR", 2, 3, new ZeroPage()),
      new CpuInstruction(85, "EOR", 2, 4, new ZeroPageX()),
      new CpuInstruction(77, "EOR", 3, 4, new Absolute()),
      new CpuInstruction(93, "EOR", 3, 4, new AbsoluteX()),
      new CpuInstruction(89, "EOR", 3, 4, new AbsoluteY()),
      new CpuInstruction(65, "EOR", 2, 6, new IndirectX()),
      new CpuInstruction(81, "EOR", 2, 5, new IndirectY()),
      new CpuInstruction(230, "INC", 2, 5, new ZeroPage()),
      new CpuInstruction(246, "INC", 2, 6, new ZeroPageX()),
      new CpuInstruction(238, "INC", 3, 6, new Absolute()),
      new CpuInstruction(254, "INC", 3, 7, new AbsoluteX()),
      new CpuInstruction(232, "INX", 1, 2, new NoneAddressing()),
      new CpuInstruction(200, "INY", 1, 2, new NoneAddressing()),
      new CpuInstruction(76, "JMP", 3, 3, new Absolute()),
      new CpuInstruction(108, "JMP", 3, 5, new Indirect()),
      new CpuInstruction(32, "JSR", 3, 6, new Absolute()),
      new CpuInstruction(169, "LDA", 2, 2, new Immediate()),
      new CpuInstruction(165, "LDA", 2, 3, new ZeroPage()),
      new CpuInstruction(181, "LDA", 2, 4, new ZeroPageX()),
      new CpuInstruction(173, "LDA", 3, 4, new Absolute()),
      new CpuInstruction(189, "LDA", 3, 4, new AbsoluteX()),
      new CpuInstruction(185, "LDA", 3, 4, new AbsoluteY()),
      new CpuInstruction(161, "LDA", 2, 6, new IndirectX()),
      new CpuInstruction(177, "LDA", 2, 5, new IndirectY()),
      new CpuInstruction(162, "LDX", 2, 2, new Immediate()),
      new CpuInstruction(166, "LDX", 2, 3, new ZeroPage()),
      new CpuInstruction(182, "LDX", 2, 4, new ZeroPageY()),
      new CpuInstruction(174, "LDX", 3, 4, new Absolute()),
      new CpuInstruction(190, "LDX", 3, 4, new AbsoluteY()),
      new CpuInstruction(160, "LDY", 2, 2, new Immediate()),
      new CpuInstruction(164, "LDY", 2, 3, new ZeroPage()),
      new CpuInstruction(180, "LDY", 2, 4, new ZeroPageX()),
      new CpuInstruction(172, "LDY", 3, 4, new Absolute()),
      new CpuInstruction(188, "LDY", 3, 4, new AbsoluteX()),
      new CpuInstruction(74, "LSR", 1, 2, new Accumulator()),
      new CpuInstruction(70, "LSR", 2, 5, new ZeroPage()),
      new CpuInstruction(86, "LSR", 2, 6, new ZeroPageX()),
      new CpuInstruction(78, "LSR", 3, 6, new Absolute()),
      new CpuInstruction(94, "LSR", 3, 7, new AbsoluteX()),
      new CpuInstruction(234, "NOP", 1, 2, new NoneAddressing()),
      new CpuInstruction(9, "ORA", 2, 2, new Immediate()),
      new CpuInstruction(5, "ORA", 2, 3, new ZeroPage()),
      new CpuInstruction(21, "ORA", 2, 4, new ZeroPageX()),
      new CpuInstruction(13, "ORA", 3, 4, new Absolute()),
      new CpuInstruction(29, "ORA", 3, 4, new AbsoluteX()),
      new CpuInstruction(25, "ORA", 3, 4, new AbsoluteY()),
      new CpuInstruction(1, "ORA", 2, 6, new IndirectX()),
      new CpuInstruction(17, "ORA", 2, 5, new IndirectY()),
      new CpuInstruction(72, "PHA", 1, 3, new NoneAddressing()),
      new CpuInstruction(8, "PHP", 1, 3, new NoneAddressing()),
      new CpuInstruction(104, "PLA", 1, 4, new NoneAddressing()),
      new CpuInstruction(40, "PLP", 1, 4, new NoneAddressing()),
      new CpuInstruction(42, "ROL", 1, 2, new Accumulator()),
      new CpuInstruction(38, "ROL", 2, 5, new ZeroPage()),
      new CpuInstruction(54, "ROL", 2, 6, new ZeroPageX()),
      new CpuInstruction(46, "ROL", 3, 6, new Absolute()),
      new CpuInstruction(62, "ROL", 3, 7, new AbsoluteX()),
      new CpuInstruction(106, "ROR", 1, 2, new Accumulator()),
      new CpuInstruction(102, "ROR", 2, 5, new ZeroPage()),
      new CpuInstruction(118, "ROR", 2, 6, new ZeroPageX()),
      new CpuInstruction(110, "ROR", 3, 6, new Absolute()),
      new CpuInstruction(126, "ROR", 3, 7, new AbsoluteX()),
      new CpuInstruction(64, "RTI", 1, 6, new NoneAddressing()),
      new CpuInstruction(96, "RTS", 1, 6, new NoneAddressing()),
      new CpuInstruction(233, "SBC", 2, 2, new Immediate()),
      new CpuInstruction(229, "SBC", 2, 3, new ZeroPage()),
      new CpuInstruction(245, "SBC", 2, 4, new ZeroPageX()),
      new CpuInstruction(237, "SBC", 3, 4, new Absolute()),
      new CpuInstruction(253, "SBC", 3, 4, new AbsoluteX()),
      new CpuInstruction(249, "SBC", 3, 4, new AbsoluteY()),
      new CpuInstruction(225, "SBC", 2, 6, new IndirectX()),
      new CpuInstruction(241, "SBC", 2, 5, new IndirectY()),
      new CpuInstruction(56, "SEC", 1, 2, new NoneAddressing()),
      new CpuInstruction(248, "SED", 1, 2, new NoneAddressing()),
      new CpuInstruction(120, "SEI", 1, 2, new NoneAddressing()),
      new CpuInstruction(133, "STA", 2, 3, new ZeroPage()),
      new CpuInstruction(149, "STA", 2, 4, new ZeroPageX()),
      new CpuInstruction(141, "STA", 3, 4, new Absolute()),
      new CpuInstruction(157, "STA", 3, 5, new AbsoluteX()),
      new CpuInstruction(153, "STA", 3, 5, new AbsoluteY()),
      new CpuInstruction(129, "STA", 2, 6, new IndirectX()),
      new CpuInstruction(145, "STA", 2, 6, new IndirectY()),
      new CpuInstruction(134, "STX", 2, 3, new ZeroPage()),
      new CpuInstruction(150, "STX", 2, 4, new ZeroPageY()),
      new CpuInstruction(142, "STX", 3, 4, new Absolute()),
      new CpuInstruction(132, "STY", 2, 3, new ZeroPage()),
      new CpuInstruction(148, "STY", 2, 4, new ZeroPageX()),
      new CpuInstruction(140, "STY", 3, 4, new Absolute()),
      new CpuInstruction(170, "TAX", 1, 2, new NoneAddressing()),
      new CpuInstruction(168, "TAY", 1, 2, new NoneAddressing()),
      new CpuInstruction(186, "TSX", 1, 2, new NoneAddressing()),
      new CpuInstruction(138, "TXA", 1, 2, new NoneAddressing()),
      new CpuInstruction(154, "TXS", 1, 2, new NoneAddressing()),
      new CpuInstruction(152, "TYA", 1, 2, new NoneAddressing())
    ])
  );
}

// build/dev/javascript/gleamness/emulation/flags.mjs
function update_flags(cpu, result, flags_to_update) {
  let status = cpu.status;
  let status$1 = bitwise_or(status, flag_unused);
  let status$2 = fold5(
    flags_to_update,
    status$1,
    (status2, flag) => {
      if (flag === 2) {
        let f = flag;
        let $ = result === 0;
        if ($) {
          return bitwise_or(status2, flag_zero);
        } else {
          return bitwise_and(
            status2,
            bitwise_exclusive_or(255, flag_zero)
          );
        }
      } else if (flag === 128) {
        let f = flag;
        let $ = bitwise_and(result, 128) !== 0;
        if ($) {
          return bitwise_or(status2, flag_negative);
        } else {
          return bitwise_and(
            status2,
            bitwise_exclusive_or(255, flag_negative)
          );
        }
      } else if (flag === 1) {
        let f = flag;
        return status2;
      } else if (flag === 64) {
        let f = flag;
        return status2;
      } else {
        return status2;
      }
    }
  );
  let _record = cpu;
  return new CPU(
    _record.register_a,
    _record.register_x,
    _record.register_y,
    status$2,
    _record.program_counter,
    _record.stack_pointer,
    _record.memory,
    _record.bus
  );
}
function is_flag_set(cpu, flag) {
  return bitwise_and(cpu.status, flag) !== 0;
}
function set_flag(cpu, flag) {
  let status = bitwise_or(cpu.status, flag);
  let _record = cpu;
  return new CPU(
    _record.register_a,
    _record.register_x,
    _record.register_y,
    status,
    _record.program_counter,
    _record.stack_pointer,
    _record.memory,
    _record.bus
  );
}
function clear_flag(cpu, flag) {
  let status = bitwise_and(
    cpu.status,
    bitwise_exclusive_or(255, flag)
  );
  let _record = cpu;
  return new CPU(
    _record.register_a,
    _record.register_x,
    _record.register_y,
    status,
    _record.program_counter,
    _record.stack_pointer,
    _record.memory,
    _record.bus
  );
}
function update_carry_flag(cpu, carry_set) {
  if (carry_set) {
    return set_flag(cpu, flag_carry);
  } else {
    return clear_flag(cpu, flag_carry);
  }
}
function update_overflow_and_carry_flags(cpu, overflow_set, carry_set) {
  let cpu$1 = (() => {
    if (overflow_set) {
      return set_flag(cpu, flag_overflow);
    } else {
      return clear_flag(cpu, flag_overflow);
    }
  })();
  return update_carry_flag(cpu$1, carry_set);
}

// build/dev/javascript/gleamness/emulation/instructions/arithmetic.mjs
function adc(cpu, value) {
  let carry = (() => {
    let $ = is_flag_set(cpu, flag_carry);
    if ($) {
      return 1;
    } else {
      return 0;
    }
  })();
  let sum = cpu.register_a + value + carry;
  let result = bitwise_and(sum, 255);
  let carry_set = sum > 255;
  let a_sign = bitwise_and(cpu.register_a, 128);
  let m_sign = bitwise_and(value, 128);
  let r_sign = bitwise_and(result, 128);
  let overflow_set = a_sign === m_sign && a_sign !== r_sign;
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      result,
      _record.register_x,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  let cpu$2 = update_overflow_and_carry_flags(
    cpu$1,
    overflow_set,
    carry_set
  );
  return update_flags(
    cpu$2,
    result,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function sbc(cpu, value) {
  let inverted_value = bitwise_exclusive_or(value, 255);
  return adc(cpu, inverted_value);
}
function inc(cpu, addr) {
  let $ = read(cpu, addr);
  if ($.isOk()) {
    let value = $[0];
    let new_value = bitwise_and(value + 1, 255);
    let $1 = write(cpu, addr, new_value);
    if ($1.isOk()) {
      let new_cpu = $1[0];
      return update_flags(
        new_cpu,
        new_value,
        from_list2(toList([flag_zero, flag_negative]))
      );
    } else {
      return cpu;
    }
  } else {
    return cpu;
  }
}
function dec(cpu, addr) {
  let $ = read(cpu, addr);
  if ($.isOk()) {
    let value = $[0];
    let new_value = bitwise_and(value - 1, 255);
    let $1 = write(cpu, addr, new_value);
    if ($1.isOk()) {
      let new_cpu = $1[0];
      return update_flags(
        new_cpu,
        new_value,
        from_list2(toList([flag_zero, flag_negative]))
      );
    } else {
      return cpu;
    }
  } else {
    return cpu;
  }
}
function inx(cpu) {
  let value = bitwise_and(cpu.register_x + 1, 255);
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      value,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    value,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function iny(cpu) {
  let value = bitwise_and(cpu.register_y + 1, 255);
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      value,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    value,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function dex(cpu) {
  let value = bitwise_and(cpu.register_x - 1, 255);
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      value,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    value,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function dey(cpu) {
  let value = bitwise_and(cpu.register_y - 1, 255);
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      value,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    value,
    from_list2(toList([flag_zero, flag_negative]))
  );
}

// build/dev/javascript/gleamness/emulation/instructions/branch.mjs
function beq(cpu, addr) {
  let $ = is_flag_set(cpu, flag_zero);
  if ($) {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      _record.register_y,
      _record.status,
      addr,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  } else {
    return cpu;
  }
}
function bne(cpu, addr) {
  let $ = is_flag_set(cpu, flag_zero);
  if (!$) {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      _record.register_y,
      _record.status,
      addr,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  } else {
    return cpu;
  }
}
function bcs(cpu, addr) {
  let $ = is_flag_set(cpu, flag_carry);
  if ($) {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      _record.register_y,
      _record.status,
      addr,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  } else {
    return cpu;
  }
}
function bcc(cpu, addr) {
  let $ = is_flag_set(cpu, flag_carry);
  if (!$) {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      _record.register_y,
      _record.status,
      addr,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  } else {
    return cpu;
  }
}
function bmi(cpu, addr) {
  let $ = is_flag_set(cpu, flag_negative);
  if ($) {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      _record.register_y,
      _record.status,
      addr,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  } else {
    return cpu;
  }
}
function bpl(cpu, addr) {
  let $ = is_flag_set(cpu, flag_negative);
  if (!$) {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      _record.register_y,
      _record.status,
      addr,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  } else {
    return cpu;
  }
}
function bvs(cpu, addr) {
  let $ = is_flag_set(cpu, flag_overflow);
  if ($) {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      _record.register_y,
      _record.status,
      addr,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  } else {
    return cpu;
  }
}
function bvc(cpu, addr) {
  let $ = is_flag_set(cpu, flag_overflow);
  if (!$) {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      _record.register_y,
      _record.status,
      addr,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  } else {
    return cpu;
  }
}

// build/dev/javascript/gleamness/emulation/instructions/flag_ops.mjs
function clc(cpu) {
  return clear_flag(cpu, flag_carry);
}
function sec(cpu) {
  return set_flag(cpu, flag_carry);
}
function cld(cpu) {
  return clear_flag(cpu, flag_decimal_mode);
}
function sed(cpu) {
  return set_flag(cpu, flag_decimal_mode);
}
function cli(cpu) {
  return clear_flag(cpu, flag_interrupt_disable);
}
function sei(cpu) {
  return set_flag(cpu, flag_interrupt_disable);
}
function clv(cpu) {
  return clear_flag(cpu, flag_overflow);
}
function nop(cpu) {
  return cpu;
}

// build/dev/javascript/gleamness/emulation/stack.mjs
function push(cpu, value) {
  let addr = stack_base + cpu.stack_pointer;
  let $ = write(cpu, addr, value);
  if ($.isOk()) {
    let new_cpu = $[0];
    let new_sp = bitwise_and(cpu.stack_pointer - 1, 255);
    return new Ok(
      (() => {
        let _record = new_cpu;
        return new CPU(
          _record.register_a,
          _record.register_x,
          _record.register_y,
          _record.status,
          _record.program_counter,
          new_sp,
          _record.memory,
          _record.bus
        );
      })()
    );
  } else {
    return new Error(void 0);
  }
}
function pull(cpu) {
  let new_sp = bitwise_and(cpu.stack_pointer + 1, 255);
  let addr = stack_base + new_sp;
  let $ = read(cpu, addr);
  if ($.isOk()) {
    let value = $[0];
    return new Ok(
      [
        (() => {
          let _record = cpu;
          return new CPU(
            _record.register_a,
            _record.register_x,
            _record.register_y,
            _record.status,
            _record.program_counter,
            new_sp,
            _record.memory,
            _record.bus
          );
        })(),
        value
      ]
    );
  } else {
    return new Error(void 0);
  }
}

// build/dev/javascript/gleamness/emulation/instructions/jump.mjs
function jmp(cpu, addr) {
  let _record = cpu;
  return new CPU(
    _record.register_a,
    _record.register_x,
    _record.register_y,
    _record.status,
    addr,
    _record.stack_pointer,
    _record.memory,
    _record.bus
  );
}
function jsr(cpu, addr) {
  let return_addr = cpu.program_counter - 1;
  let hi = bitwise_shift_right(return_addr, 8);
  let $ = push(cpu, hi);
  if ($.isOk()) {
    let cpu1 = $[0];
    let lo = bitwise_and(return_addr, 255);
    let $1 = push(cpu1, lo);
    if ($1.isOk()) {
      let cpu2 = $1[0];
      let _record = cpu2;
      return new CPU(
        _record.register_a,
        _record.register_x,
        _record.register_y,
        _record.status,
        addr,
        _record.stack_pointer,
        _record.memory,
        _record.bus
      );
    } else {
      return cpu;
    }
  } else {
    return cpu;
  }
}
function rts(cpu) {
  let $ = pull(cpu);
  if ($.isOk()) {
    let cpu1 = $[0][0];
    let lo = $[0][1];
    let $1 = pull(cpu1);
    if ($1.isOk()) {
      let cpu2 = $1[0][0];
      let hi = $1[0][1];
      let addr = bitwise_or(bitwise_shift_left(hi, 8), lo) + 1;
      let _record = cpu2;
      return new CPU(
        _record.register_a,
        _record.register_x,
        _record.register_y,
        _record.status,
        addr,
        _record.stack_pointer,
        _record.memory,
        _record.bus
      );
    } else {
      return cpu1;
    }
  } else {
    return cpu;
  }
}
function rti(cpu) {
  let $ = pull(cpu);
  if ($.isOk()) {
    let cpu1 = $[0][0];
    let status = $[0][1];
    let status_with_unused = bitwise_or(status, flag_unused);
    let cpu1$1 = (() => {
      let _record = cpu1;
      return new CPU(
        _record.register_a,
        _record.register_x,
        _record.register_y,
        status_with_unused,
        _record.program_counter,
        _record.stack_pointer,
        _record.memory,
        _record.bus
      );
    })();
    let $1 = pull(cpu1$1);
    if ($1.isOk()) {
      let cpu2 = $1[0][0];
      let lo = $1[0][1];
      let $2 = pull(cpu2);
      if ($2.isOk()) {
        let cpu3 = $2[0][0];
        let hi = $2[0][1];
        let addr = bitwise_or(bitwise_shift_left(hi, 8), lo);
        let _record = cpu3;
        return new CPU(
          _record.register_a,
          _record.register_x,
          _record.register_y,
          _record.status,
          addr,
          _record.stack_pointer,
          _record.memory,
          _record.bus
        );
      } else {
        return cpu2;
      }
    } else {
      return cpu1$1;
    }
  } else {
    return cpu;
  }
}

// build/dev/javascript/gleamness/emulation/instructions/load_store.mjs
function lda(cpu, value) {
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      value,
      _record.register_x,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    value,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function ldx(cpu, value) {
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      value,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    value,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function ldy(cpu, value) {
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      value,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    value,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function sta(cpu, addr) {
  let $ = write(cpu, addr, cpu.register_a);
  if ($.isOk()) {
    let new_cpu = $[0];
    return new_cpu;
  } else {
    return cpu;
  }
}
function stx(cpu, addr) {
  let $ = write(cpu, addr, cpu.register_x);
  if ($.isOk()) {
    let new_cpu = $[0];
    return new_cpu;
  } else {
    return cpu;
  }
}
function sty(cpu, addr) {
  let $ = write(cpu, addr, cpu.register_y);
  if ($.isOk()) {
    let new_cpu = $[0];
    return new_cpu;
  } else {
    return cpu;
  }
}

// build/dev/javascript/gleamness/emulation/instructions/logic.mjs
function and(cpu, value) {
  let result = bitwise_and(cpu.register_a, value);
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      result,
      _record.register_x,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    result,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function eor(cpu, value) {
  let result = bitwise_exclusive_or(cpu.register_a, value);
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      result,
      _record.register_x,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    result,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function ora(cpu, value) {
  let result = bitwise_or(cpu.register_a, value);
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      result,
      _record.register_x,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    result,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function bit(cpu, value) {
  let result = bitwise_and(cpu.register_a, value);
  let zero_flag = result === 0;
  let negative_flag = bitwise_and(value, flag_negative);
  let overflow_flag = bitwise_and(value, flag_overflow);
  let cpu$1 = clear_flag(cpu, flag_zero);
  let cpu$2 = (() => {
    if (zero_flag) {
      return set_flag(cpu$1, flag_zero);
    } else {
      return cpu$1;
    }
  })();
  let cpu$3 = clear_flag(cpu$2, flag_negative);
  let cpu$4 = (() => {
    let $2 = negative_flag !== 0;
    if ($2) {
      return set_flag(cpu$3, flag_negative);
    } else {
      return cpu$3;
    }
  })();
  let cpu$5 = clear_flag(cpu$4, flag_overflow);
  let $ = overflow_flag !== 0;
  if ($) {
    return set_flag(cpu$5, flag_overflow);
  } else {
    return cpu$5;
  }
}
function asl(cpu, addr, value, mode) {
  let carry = (() => {
    let $ = bitwise_and(value, 128) !== 0;
    if ($) {
      return flag_carry;
    } else {
      return 0;
    }
  })();
  let result = bitwise_and(bitwise_shift_left(value, 1), 255);
  let cpu$1 = clear_flag(cpu, flag_carry);
  let cpu$2 = (() => {
    let $ = carry !== 0;
    if ($) {
      return set_flag(cpu$1, flag_carry);
    } else {
      return cpu$1;
    }
  })();
  let cpu$3 = (() => {
    if (mode instanceof Accumulator) {
      let _record = cpu$2;
      return new CPU(
        result,
        _record.register_x,
        _record.register_y,
        _record.status,
        _record.program_counter,
        _record.stack_pointer,
        _record.memory,
        _record.bus
      );
    } else {
      let $ = write(cpu$2, addr, result);
      if ($.isOk()) {
        let new_cpu = $[0];
        return new_cpu;
      } else {
        return cpu$2;
      }
    }
  })();
  return update_flags(
    cpu$3,
    result,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function lsr(cpu, addr, value, mode) {
  let carry = (() => {
    let $ = bitwise_and(value, 1) !== 0;
    if ($) {
      return flag_carry;
    } else {
      return 0;
    }
  })();
  let result = bitwise_shift_right(value, 1);
  let cpu$1 = clear_flag(cpu, flag_carry);
  let cpu$2 = (() => {
    let $ = carry !== 0;
    if ($) {
      return set_flag(cpu$1, flag_carry);
    } else {
      return cpu$1;
    }
  })();
  let cpu$3 = (() => {
    if (mode instanceof Accumulator) {
      let _record = cpu$2;
      return new CPU(
        result,
        _record.register_x,
        _record.register_y,
        _record.status,
        _record.program_counter,
        _record.stack_pointer,
        _record.memory,
        _record.bus
      );
    } else {
      let $ = write(cpu$2, addr, result);
      if ($.isOk()) {
        let new_cpu = $[0];
        return new_cpu;
      } else {
        return cpu$2;
      }
    }
  })();
  return update_flags(
    cpu$3,
    result,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function rol(cpu, addr, value, mode) {
  let current_carry = (() => {
    let $ = is_flag_set(cpu, flag_carry);
    if ($) {
      return 1;
    } else {
      return 0;
    }
  })();
  let new_carry = (() => {
    let $ = bitwise_and(value, 128) !== 0;
    if ($) {
      return flag_carry;
    } else {
      return 0;
    }
  })();
  let result = bitwise_or(
    bitwise_and(bitwise_shift_left(value, 1), 255),
    current_carry
  );
  let cpu$1 = clear_flag(cpu, flag_carry);
  let cpu$2 = (() => {
    let $ = new_carry !== 0;
    if ($) {
      return set_flag(cpu$1, flag_carry);
    } else {
      return cpu$1;
    }
  })();
  let cpu$3 = (() => {
    if (mode instanceof Accumulator) {
      let _record = cpu$2;
      return new CPU(
        result,
        _record.register_x,
        _record.register_y,
        _record.status,
        _record.program_counter,
        _record.stack_pointer,
        _record.memory,
        _record.bus
      );
    } else {
      let $ = write(cpu$2, addr, result);
      if ($.isOk()) {
        let new_cpu = $[0];
        return new_cpu;
      } else {
        return cpu$2;
      }
    }
  })();
  return update_flags(
    cpu$3,
    result,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function ror(cpu, addr, value, mode) {
  let current_carry = (() => {
    let $ = is_flag_set(cpu, flag_carry);
    if ($) {
      return 128;
    } else {
      return 0;
    }
  })();
  let new_carry = (() => {
    let $ = bitwise_and(value, 1) !== 0;
    if ($) {
      return flag_carry;
    } else {
      return 0;
    }
  })();
  let result = bitwise_or(
    bitwise_shift_right(value, 1),
    current_carry
  );
  let cpu$1 = clear_flag(cpu, flag_carry);
  let cpu$2 = (() => {
    let $ = new_carry !== 0;
    if ($) {
      return set_flag(cpu$1, flag_carry);
    } else {
      return cpu$1;
    }
  })();
  let cpu$3 = (() => {
    if (mode instanceof Accumulator) {
      let _record = cpu$2;
      return new CPU(
        result,
        _record.register_x,
        _record.register_y,
        _record.status,
        _record.program_counter,
        _record.stack_pointer,
        _record.memory,
        _record.bus
      );
    } else {
      let $ = write(cpu$2, addr, result);
      if ($.isOk()) {
        let new_cpu = $[0];
        return new_cpu;
      } else {
        return cpu$2;
      }
    }
  })();
  return update_flags(
    cpu$3,
    result,
    from_list2(toList([flag_zero, flag_negative]))
  );
}

// build/dev/javascript/gleamness/emulation/instructions/stack_ops.mjs
function pha(cpu) {
  let $ = push(cpu, cpu.register_a);
  if ($.isOk()) {
    let new_cpu = $[0];
    return new_cpu;
  } else {
    return cpu;
  }
}
function pla(cpu) {
  let $ = pull(cpu);
  if ($.isOk()) {
    let cpu1 = $[0][0];
    let value = $[0][1];
    let cpu2 = (() => {
      let _record = cpu1;
      return new CPU(
        value,
        _record.register_x,
        _record.register_y,
        _record.status,
        _record.program_counter,
        _record.stack_pointer,
        _record.memory,
        _record.bus
      );
    })();
    return update_flags(
      cpu2,
      value,
      from_list2(toList([flag_zero, flag_negative]))
    );
  } else {
    return cpu;
  }
}
function php(cpu) {
  let break_flag = 48;
  let status_with_break = bitwise_or(cpu.status, break_flag);
  let $ = push(cpu, status_with_break);
  if ($.isOk()) {
    let new_cpu = $[0];
    return new_cpu;
  } else {
    return cpu;
  }
}
function plp(cpu) {
  let $ = pull(cpu);
  if ($.isOk()) {
    let cpu1 = $[0][0];
    let status = $[0][1];
    let status_with_unused = bitwise_or(status, flag_unused);
    let break_mask = 16;
    let status_with_break = bitwise_and(
      cpu.status,
      bitwise_exclusive_or(255, break_mask)
    );
    let status_with_unused_and_break = bitwise_or(
      status_with_unused,
      status_with_break
    );
    let _record = cpu1;
    return new CPU(
      _record.register_a,
      _record.register_x,
      _record.register_y,
      status_with_unused_and_break,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  } else {
    return cpu;
  }
}

// build/dev/javascript/gleamness/emulation/instructions/transfer.mjs
function tax(cpu) {
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      cpu.register_a,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    cpu$1.register_x,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function tay(cpu) {
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      _record.register_x,
      cpu.register_a,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    cpu$1.register_y,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function txa(cpu) {
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      cpu.register_x,
      _record.register_x,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    cpu$1.register_a,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function tya(cpu) {
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      cpu.register_y,
      _record.register_x,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    cpu$1.register_a,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function tsx(cpu) {
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      _record.register_a,
      cpu.stack_pointer,
      _record.register_y,
      _record.status,
      _record.program_counter,
      _record.stack_pointer,
      _record.memory,
      _record.bus
    );
  })();
  return update_flags(
    cpu$1,
    cpu$1.register_x,
    from_list2(toList([flag_zero, flag_negative]))
  );
}
function txs(cpu) {
  let _record = cpu;
  return new CPU(
    _record.register_a,
    _record.register_x,
    _record.register_y,
    _record.status,
    _record.program_counter,
    cpu.register_x,
    _record.memory,
    _record.bus
  );
}

// build/dev/javascript/gleamness/emulation/cpu.mjs
function get_new_cpu() {
  return new CPU(
    0,
    0,
    0,
    flag_unused,
    0,
    stack_reset,
    init_memory(),
    new Bus(repeat2(0, 8192))
  );
}
function reset(cpu) {
  let cpu$1 = (() => {
    let _record = cpu;
    return new CPU(
      0,
      0,
      0,
      flag_unused,
      _record.program_counter,
      stack_reset,
      _record.memory,
      _record.bus
    );
  })();
  let $ = read_u16(cpu$1, 65532);
  if ($.isOk()) {
    let pc_address = $[0];
    return new Ok(
      (() => {
        let _record = cpu$1;
        return new CPU(
          _record.register_a,
          _record.register_x,
          _record.register_y,
          _record.status,
          pc_address,
          _record.stack_pointer,
          _record.memory,
          _record.bus
        );
      })()
    );
  } else {
    return new Error(void 0);
  }
}
function load_at_address(cpu, program, start_address) {
  let length4 = length3(program);
  return fold5(
    range(0, length4 - 1),
    new Ok(cpu),
    (acc, index3) => {
      if (!acc.isOk()) {
        return acc;
      } else {
        let current_cpu = acc[0];
        let $ = get(program, index3);
        if ($.isOk()) {
          let byte = $[0];
          return write(current_cpu, start_address + index3, byte);
        } else {
          return new Error(void 0);
        }
      }
    }
  );
}
function load(cpu, program) {
  let $ = load_at_address(cpu, program, 1536);
  if ($.isOk()) {
    let cpu_with_program = $[0];
    return write_u16(cpu_with_program, 65532, 1536);
  } else {
    return new Error(void 0);
  }
}
function find_instruction(opcode) {
  let instructions = get_all_instructions();
  return find2(instructions, (instr) => {
    return instr.opcode === opcode;
  });
}
function execute_instruction(cpu, instruction, operand_addr, operand_value) {
  let $ = instruction.mnemonic;
  if ($ === "LDA") {
    return lda(cpu, operand_value);
  } else if ($ === "LDX") {
    return ldx(cpu, operand_value);
  } else if ($ === "LDY") {
    return ldy(cpu, operand_value);
  } else if ($ === "STA") {
    return sta(cpu, operand_addr);
  } else if ($ === "STX") {
    return stx(cpu, operand_addr);
  } else if ($ === "STY") {
    return sty(cpu, operand_addr);
  } else if ($ === "TAX") {
    return tax(cpu);
  } else if ($ === "TAY") {
    return tay(cpu);
  } else if ($ === "TXA") {
    return txa(cpu);
  } else if ($ === "TYA") {
    return tya(cpu);
  } else if ($ === "TSX") {
    return tsx(cpu);
  } else if ($ === "TXS") {
    return txs(cpu);
  } else if ($ === "PHA") {
    return pha(cpu);
  } else if ($ === "PLA") {
    return pla(cpu);
  } else if ($ === "PHP") {
    return php(cpu);
  } else if ($ === "PLP") {
    return plp(cpu);
  } else if ($ === "ADC") {
    return adc(cpu, operand_value);
  } else if ($ === "SBC") {
    return sbc(cpu, operand_value);
  } else if ($ === "INC") {
    return inc(cpu, operand_addr);
  } else if ($ === "INX") {
    return inx(cpu);
  } else if ($ === "INY") {
    return iny(cpu);
  } else if ($ === "DEC") {
    return dec(cpu, operand_addr);
  } else if ($ === "DEX") {
    return dex(cpu);
  } else if ($ === "DEY") {
    return dey(cpu);
  } else if ($ === "AND") {
    return and(cpu, operand_value);
  } else if ($ === "EOR") {
    return eor(cpu, operand_value);
  } else if ($ === "ORA") {
    return ora(cpu, operand_value);
  } else if ($ === "BIT") {
    return bit(cpu, operand_value);
  } else if ($ === "ASL") {
    return asl(
      cpu,
      operand_addr,
      operand_value,
      instruction.addressing_mode
    );
  } else if ($ === "LSR") {
    return lsr(
      cpu,
      operand_addr,
      operand_value,
      instruction.addressing_mode
    );
  } else if ($ === "ROL") {
    return rol(
      cpu,
      operand_addr,
      operand_value,
      instruction.addressing_mode
    );
  } else if ($ === "ROR") {
    return ror(
      cpu,
      operand_addr,
      operand_value,
      instruction.addressing_mode
    );
  } else if ($ === "JMP") {
    return jmp(cpu, operand_addr);
  } else if ($ === "JSR") {
    return jsr(cpu, operand_addr);
  } else if ($ === "RTS") {
    return rts(cpu);
  } else if ($ === "RTI") {
    return rti(cpu);
  } else if ($ === "BEQ") {
    return beq(cpu, operand_addr);
  } else if ($ === "BNE") {
    return bne(cpu, operand_addr);
  } else if ($ === "BCS") {
    return bcs(cpu, operand_addr);
  } else if ($ === "BCC") {
    return bcc(cpu, operand_addr);
  } else if ($ === "BMI") {
    return bmi(cpu, operand_addr);
  } else if ($ === "BPL") {
    return bpl(cpu, operand_addr);
  } else if ($ === "BVS") {
    return bvs(cpu, operand_addr);
  } else if ($ === "BVC") {
    return bvc(cpu, operand_addr);
  } else if ($ === "CLC") {
    return clc(cpu);
  } else if ($ === "SEC") {
    return sec(cpu);
  } else if ($ === "CLD") {
    return cld(cpu);
  } else if ($ === "SED") {
    return sed(cpu);
  } else if ($ === "CLI") {
    return cli(cpu);
  } else if ($ === "SEI") {
    return sei(cpu);
  } else if ($ === "CLV") {
    return clv(cpu);
  } else if ($ === "NOP") {
    return nop(cpu);
  } else if ($ === "BRK") {
    return cpu;
  } else {
    return cpu;
  }
}
function interpret_loop(loop$cpu, loop$program, loop$callback) {
  while (true) {
    let cpu = loop$cpu;
    let program = loop$program;
    let callback = loop$callback;
    let cpu$1 = callback(cpu);
    let $ = get(program, cpu$1.program_counter);
    if (!$.isOk()) {
      return cpu$1;
    } else {
      let opcode = $[0];
      let instruction = find_instruction(opcode);
      let cpu$2 = (() => {
        let _record = cpu$1;
        return new CPU(
          _record.register_a,
          _record.register_x,
          _record.register_y,
          _record.status,
          cpu$1.program_counter + 1,
          _record.stack_pointer,
          _record.memory,
          _record.bus
        );
      })();
      let cpu$3 = (() => {
        if (instruction.isOk() && instruction[0].opcode === 0) {
          let instr = instruction[0];
          return cpu$2;
        } else if (instruction.isOk()) {
          let instr = instruction[0];
          debug(instr);
          let $1 = get_operand_address(
            cpu$2,
            program,
            instr.addressing_mode
          );
          let cpu$32 = $1[0];
          let operand_addr = $1[1];
          let operand_value = get_operand_value(
            cpu$32,
            program,
            instr.addressing_mode,
            operand_addr
          );
          return execute_instruction(cpu$32, instr, operand_addr, operand_value);
        } else {
          return cpu$2;
        }
      })();
      loop$cpu = cpu$3;
      loop$program = program;
      loop$callback = callback;
    }
  }
}
function run_with_callback(cpu, program, callback) {
  return interpret_loop(cpu, program, callback);
}
function load_and_run_with_callback(cpu, program, callback) {
  let $ = load(cpu, program);
  if ($.isOk()) {
    let new_cpu = $[0];
    let $1 = reset(new_cpu);
    if ($1.isOk()) {
      let reset_cpu = $1[0];
      return new Ok(
        run_with_callback(reset_cpu, reset_cpu.bus.cpu_vram, callback)
      );
    } else {
      return new Error(void 0);
    }
  } else {
    return new Error(void 0);
  }
}

// build/dev/javascript/gleamness/emulation/screen.mjs
var Black = class extends CustomType {
};
var White = class extends CustomType {
};
var Grey = class extends CustomType {
};
var Red = class extends CustomType {
};
var Green = class extends CustomType {
};
var Blue = class extends CustomType {
};
var Magenta = class extends CustomType {
};
var Yellow = class extends CustomType {
};
var Cyan = class extends CustomType {
};
var ScreenState = class extends CustomType {
  constructor(frame, changed) {
    super();
    this.frame = frame;
    this.changed = changed;
  }
};
function new_screen_state() {
  return new ScreenState(repeat2(0, 32 * 32 * 3), false);
}
function get_color(byte) {
  if (byte === 0) {
    return new Black();
  } else if (byte === 1) {
    return new White();
  } else if (byte === 2) {
    return new Grey();
  } else if (byte === 9) {
    return new Grey();
  } else if (byte === 3) {
    return new Red();
  } else if (byte === 10) {
    return new Red();
  } else if (byte === 4) {
    return new Green();
  } else if (byte === 11) {
    return new Green();
  } else if (byte === 5) {
    return new Blue();
  } else if (byte === 12) {
    return new Blue();
  } else if (byte === 6) {
    return new Magenta();
  } else if (byte === 13) {
    return new Magenta();
  } else if (byte === 7) {
    return new Yellow();
  } else if (byte === 14) {
    return new Yellow();
  } else {
    return new Cyan();
  }
}
function color_to_rgb(color) {
  if (color instanceof Black) {
    return [0, 0, 0];
  } else if (color instanceof White) {
    return [255, 255, 255];
  } else if (color instanceof Grey) {
    return [128, 128, 128];
  } else if (color instanceof Red) {
    return [255, 0, 0];
  } else if (color instanceof Green) {
    return [0, 255, 0];
  } else if (color instanceof Blue) {
    return [0, 0, 255];
  } else if (color instanceof Magenta) {
    return [255, 0, 255];
  } else if (color instanceof Yellow) {
    return [255, 255, 0];
  } else {
    return [0, 255, 255];
  }
}
function update_frame_slice(frame, frame_idx, color) {
  let $ = color_to_rgb(color);
  let r = $[0];
  let g = $[1];
  let b = $[2];
  let _pipe = frame;
  let _pipe$1 = try_set(_pipe, frame_idx, r);
  let _pipe$2 = try_set(_pipe$1, frame_idx + 1, g);
  return try_set(_pipe$2, frame_idx + 2, b);
}
function get_current_colors(frame, idx) {
  let r = (() => {
    let $ = get(frame, idx);
    if ($.isOk()) {
      let v = $[0];
      return v;
    } else {
      return 0;
    }
  })();
  let g = (() => {
    let $ = get(frame, idx + 1);
    if ($.isOk()) {
      let v = $[0];
      return v;
    } else {
      return 0;
    }
  })();
  let b = (() => {
    let $ = get(frame, idx + 2);
    if ($.isOk()) {
      let v = $[0];
      return v;
    } else {
      return 0;
    }
  })();
  return [r, g, b];
}
function read_screen_state(cpu, state) {
  debug(to_list(state.frame));
  let new_frame = (() => {
    let _pipe = range(512, 1536);
    return fold5(
      _pipe,
      [state.frame, false],
      (acc, addr) => {
        let frame2 = acc[0];
        let $ = read(cpu, addr);
        if ($.isOk()) {
          let color_idx = $[0];
          let color = get_color(color_idx);
          let frame_idx = (addr - 512) * 3;
          let $1 = get_current_colors(frame2, frame_idx);
          let old_r = $1[0];
          let old_g = $1[1];
          let old_b = $1[2];
          let $2 = color_to_rgb(color);
          let new_r = $2[0];
          let new_g = $2[1];
          let new_b = $2[2];
          let $3 = old_r === new_r && old_g === new_g && old_b === new_b;
          if ($3) {
            return acc;
          } else {
            let new_frame2 = update_frame_slice(frame2, frame_idx, color);
            return [new_frame2, true];
          }
        } else {
          return acc;
        }
      }
    );
  })();
  let frame = new_frame[0];
  let changed = new_frame[1];
  return new ScreenState(frame, changed || state.changed);
}

// build/dev/javascript/gleamness/ffi.mjs
function every(interval, cb) {
  window.setInterval(cb, interval);
}
function set_timeout(cb, delay) {
  window.setTimeout(cb, delay);
}
function getCanvasContext(canvasId) {
  const canvas2 = document.querySelector(canvasId);
  if (!canvas2)
    return null;
  const ctx = canvas2.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
function setCanvasScale(ctx, scaleX, scaleY) {
  if (!ctx)
    return;
  ctx.scale(scaleX, scaleY);
}
function createTexture(width2, height2) {
  const offscreen = new OffscreenCanvas(width2, height2);
  const ctx = offscreen.getContext("2d");
  return { canvas: offscreen, ctx };
}
function drawTexture(ctx, texture, x, y) {
  if (!ctx || !texture)
    return;
  ctx.drawImage(texture.canvas, x, y);
}
function updateTextureWithFrame(texture, frameData, width2, height2) {
  console.log(frameData);
  frameData = [...frameData];
  console.log(frameData.filter((v) => v !== 0));
  if (!texture || !texture.ctx)
    return;
  for (let y = 0; y < height2; y++) {
    for (let x = 0; x < width2; x++) {
      const frameIdx = (y * width2 + x) * 3;
      const r = frameData[frameIdx];
      const g = frameData[frameIdx + 1];
      const b = frameData[frameIdx + 2];
      texture.ctx.fillStyle = `rgb(${r},${g},${b})`;
      texture.ctx.fillRect(x, y, 1, 1);
    }
  }
}

// build/dev/javascript/gleamness/gleamness.mjs
var Model2 = class extends CustomType {
  constructor(cpu, window_width, window_height, scale, key_pressed, canvas_ctx, texture, screen_state) {
    super();
    this.cpu = cpu;
    this.window_width = window_width;
    this.window_height = window_height;
    this.scale = scale;
    this.key_pressed = key_pressed;
    this.canvas_ctx = canvas_ctx;
    this.texture = texture;
    this.screen_state = screen_state;
  }
};
var Tick = class extends CustomType {
};
var KeyDown = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var KeyUp = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ContextReady = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Mounted = class extends CustomType {
};
function every2(interval, tick) {
  return from(
    (dispatch) => {
      return every(interval, () => {
        return dispatch(tick);
      });
    }
  );
}
function init_canvas() {
  return from(
    (dispatch) => {
      let ctx = getCanvasContext("canvas");
      dispatch(new ContextReady(ctx));
      return void 0;
    }
  );
}
function render_effect(msg) {
  return from(
    (dispatch) => {
      set_timeout(() => {
        return dispatch(msg);
      }, 0);
      return void 0;
    }
  );
}
function init2(_) {
  let game_code = from_list2(
    toList([
      32,
      6,
      6,
      32,
      56,
      6,
      32,
      13,
      6,
      32,
      42,
      6,
      96,
      169,
      2,
      133,
      2,
      169,
      4,
      133,
      3,
      169,
      17,
      133,
      16,
      169,
      16,
      133,
      18,
      169,
      15,
      133,
      20,
      169,
      4,
      133,
      17,
      133,
      19,
      133,
      21,
      96,
      165,
      254,
      133,
      0,
      165,
      254,
      41,
      3,
      24,
      105,
      2,
      133,
      1,
      96,
      32,
      77,
      6,
      32,
      141,
      6,
      32,
      195,
      6,
      32,
      25,
      7,
      32,
      32,
      7,
      32,
      45,
      7,
      76,
      56,
      6,
      165,
      255,
      201,
      119,
      240,
      13,
      201,
      100,
      240,
      20,
      201,
      115,
      240,
      27,
      201,
      97,
      240,
      34,
      96,
      169,
      4,
      36,
      2,
      208,
      38,
      169,
      1,
      133,
      2,
      96,
      169,
      8,
      36,
      2,
      208,
      27,
      169,
      2,
      133,
      2,
      96,
      169,
      1,
      36,
      2,
      208,
      16,
      169,
      4,
      133,
      2,
      96,
      169,
      2,
      36,
      2,
      208,
      5,
      169,
      8,
      133,
      2,
      96,
      96,
      32,
      148,
      6,
      32,
      168,
      6,
      96,
      165,
      0,
      197,
      16,
      208,
      13,
      165,
      1,
      197,
      17,
      208,
      7,
      230,
      3,
      230,
      3,
      32,
      42,
      6,
      96,
      162,
      2,
      181,
      16,
      197,
      16,
      208,
      6,
      181,
      17,
      197,
      17,
      240,
      9,
      232,
      232,
      228,
      3,
      240,
      6,
      76,
      170,
      6,
      76,
      53,
      7,
      96,
      166,
      3,
      202,
      138,
      181,
      16,
      149,
      18,
      202,
      16,
      249,
      165,
      2,
      74,
      176,
      9,
      74,
      176,
      25,
      74,
      176,
      31,
      74,
      176,
      47,
      165,
      16,
      56,
      233,
      32,
      133,
      16,
      144,
      1,
      96,
      198,
      17,
      169,
      1,
      197,
      17,
      240,
      40,
      96,
      230,
      16,
      169,
      31,
      36,
      16,
      240,
      31,
      96,
      165,
      16,
      24,
      105,
      32,
      133,
      16,
      176,
      1,
      96,
      230,
      17,
      169,
      6,
      197,
      17,
      240,
      12,
      96,
      198,
      16,
      165,
      16,
      41,
      31,
      201,
      31,
      240,
      1,
      96,
      76,
      53,
      7,
      160,
      0,
      165,
      254,
      145,
      0,
      96,
      166,
      3,
      169,
      0,
      129,
      16,
      162,
      0,
      169,
      1,
      129,
      16,
      96,
      162,
      0,
      234,
      234,
      202,
      208,
      251,
      96
    ])
  );
  let new_cpu = get_new_cpu();
  let cpu_with_game = (() => {
    let $ = load_and_run_with_callback(
      new_cpu,
      game_code,
      (cpu) => {
        return cpu;
      }
    );
    if ($.isOk()) {
      let loaded_cpu = $[0];
      return loaded_cpu;
    } else {
      return new_cpu;
    }
  })();
  return [
    new Model2(
      cpu_with_game,
      32,
      32,
      10,
      from_list2(toList([])),
      new None(),
      new None(),
      new_screen_state()
    ),
    batch(
      toList([every2(1600, new Tick()), render_effect(new Mounted())])
    )
  ];
}
function update(model, msg) {
  if (msg instanceof Mounted) {
    return [model, init_canvas()];
  } else if (msg instanceof Tick) {
    let $ = model.canvas_ctx;
    let $1 = model.texture;
    if ($ instanceof Some && $1 instanceof Some) {
      let ctx = $[0];
      let texture = $1[0];
      let new_screen_state2 = read_screen_state(
        model.cpu,
        model.screen_state
      );
      let $2 = new_screen_state2.changed;
      if ($2) {
        updateTextureWithFrame(
          texture,
          to_list(new_screen_state2.frame),
          model.window_width,
          model.window_height
        );
        drawTexture(ctx, texture, 0, 0);
      } else {
      }
      return [
        (() => {
          let _record = model;
          return new Model2(
            _record.cpu,
            _record.window_width,
            _record.window_height,
            _record.scale,
            _record.key_pressed,
            _record.canvas_ctx,
            _record.texture,
            new_screen_state2
          );
        })(),
        none()
      ];
    } else {
      return [model, none()];
    }
  } else if (msg instanceof ContextReady) {
    let ctx = msg[0];
    setCanvasScale(
      ctx,
      identity(model.scale),
      identity(model.scale)
    );
    let texture = createTexture(model.window_width, model.window_height);
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.cpu,
          _record.window_width,
          _record.window_height,
          _record.scale,
          _record.key_pressed,
          new Some(ctx),
          new Some(texture),
          _record.screen_state
        );
      })(),
      none()
    ];
  } else if (msg instanceof KeyDown) {
    let key = msg[0];
    let cpu = (() => {
      if (key === "w") {
        let $ = write(model.cpu, 255, 119);
        if (!$.isOk()) {
          throw makeError(
            "let_assert",
            "gleamness",
            193,
            "update",
            "Pattern match failed, no pattern matched the value.",
            { value: $ }
          );
        }
        let new_cpu = $[0];
        return new_cpu;
      } else if (key === "s") {
        let $ = write(model.cpu, 255, 115);
        if (!$.isOk()) {
          throw makeError(
            "let_assert",
            "gleamness",
            197,
            "update",
            "Pattern match failed, no pattern matched the value.",
            { value: $ }
          );
        }
        let new_cpu = $[0];
        return new_cpu;
      } else if (key === "a") {
        let $ = write(model.cpu, 255, 97);
        if (!$.isOk()) {
          throw makeError(
            "let_assert",
            "gleamness",
            201,
            "update",
            "Pattern match failed, no pattern matched the value.",
            { value: $ }
          );
        }
        let new_cpu = $[0];
        return new_cpu;
      } else if (key === "d") {
        let $ = write(model.cpu, 255, 100);
        if (!$.isOk()) {
          throw makeError(
            "let_assert",
            "gleamness",
            205,
            "update",
            "Pattern match failed, no pattern matched the value.",
            { value: $ }
          );
        }
        let new_cpu = $[0];
        return new_cpu;
      } else {
        return model.cpu;
      }
    })();
    return [
      (() => {
        let _record = model;
        return new Model2(
          cpu,
          _record.window_width,
          _record.window_height,
          _record.scale,
          prepend4(model.key_pressed, key),
          _record.canvas_ctx,
          _record.texture,
          _record.screen_state
        );
      })(),
      none()
    ];
  } else {
    let key = msg[0];
    let updated_keys = filter(
      model.key_pressed,
      (k) => {
        return k !== key;
      }
    );
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.cpu,
          _record.window_width,
          _record.window_height,
          _record.scale,
          updated_keys,
          _record.canvas_ctx,
          _record.texture,
          _record.screen_state
        );
      })(),
      none()
    ];
  }
}
function view(model) {
  let width2 = model.window_width * model.scale;
  let height2 = model.window_height * model.scale;
  return div(
    toList([
      on_keydown((var0) => {
        return new KeyDown(var0);
      }),
      on_keyup((var0) => {
        return new KeyUp(var0);
      }),
      style(toList([["outline", "none"]]))
    ]),
    toList([
      canvas(toList([width(width2), height(height2)]))
    ])
  );
}
function main() {
  let app = application(init2, update, view);
  let $ = start2(app, "#app", void 0);
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "gleamness",
      244,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
