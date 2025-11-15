var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// .wrangler/tmp/bundle-1rvnZT/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// ../gilbert-logger/lib/index.js
var createLogger = /* @__PURE__ */ __name((debug = false) => {
  if (debug) {
    return {
      /**
       * Log general information asynchronously
       * @param {...any} args - Arguments to log
       * @returns {*} Timer ID from setTimeout
       */
      // eslint-disable-next-line no-console
      log: (...args) => setTimeout(() => console.log(...args), 0),
      /**
       * Log warnings asynchronously
       * @param {...any} args - Arguments to log
       * @returns {*} Timer ID from setTimeout
       */
      // eslint-disable-next-line no-console
      warn: (...args) => setTimeout(() => console.warn(...args), 0),
      /**
       * Log errors synchronously (for reliability)
       * @param {...any} args - Arguments to log
       * @returns {void}
       */
      // eslint-disable-next-line no-console
      error: (...args) => console.error(...args),
      /**
       * Log debug information asynchronously
       * @param {...any} args - Arguments to log
       * @returns {*} Timer ID from setTimeout
       */
      // eslint-disable-next-line no-console
      debug: (...args) => setTimeout(() => console.log("[DEBUG]", ...args), 0),
      /**
       * Check if debug mode is enabled
       * @returns {boolean} True if debug mode is enabled
       */
      isEnabled: () => true
    };
  } else {
    return {
      /**
       * No-op log function
       */
      log: () => {
      },
      /**
       * No-op warn function
       */
      warn: () => {
      },
      /**
       * Log errors synchronously (always enabled for critical issues)
       * @param {...any} args - Arguments to log
       */
      // eslint-disable-next-line no-console
      error: (...args) => console.error(...args),
      /**
       * No-op debug function
       */
      debug: () => {
      },
      /**
       * Check if debug mode is enabled
       * @returns {boolean} False if debug mode is disabled
       */
      isEnabled: () => false
    };
  }
}, "createLogger");

// lib/index.js
var logger = createLogger(globalThis.GILBERT_DEBUG === "true");
var _bucket, _binding, _maxFileSize, _writeFile, writeFile_fn;
var _GilbertR2 = class {
  /**
   * Creates an instance of GilbertR2 with bucket configuration
   * @param {GilbertR2Options} options - Configuration for this adapter instance
   */
  constructor(options) {
    // Private fields for encapsulation
    __privateAdd(this, _bucket, void 0);
    __privateAdd(this, _binding, void 0);
    __privateAdd(this, _maxFileSize, void 0);
    if (!options?.bucket && !options?.binding) {
      throw new Error("Either bucket name or R2 binding is required");
    }
    __privateSet(this, _bucket, options.bucket);
    __privateSet(this, _binding, options.binding);
    __privateSet(this, _maxFileSize, options.maxFileSize || 104857600);
    if (globalThis.GILBERT_DEBUG === "true") {
      logger.debug(`GilbertR2: Initialized with bucket: ${__privateGet(this, _bucket)}, maxFileSize: ${__privateGet(this, _maxFileSize)}`);
    }
  }
  /**
   * Creates a ReadableStream for reading files from R2
   * @throws {Error} Always throws - read operations not implemented in initial version
   * @returns {never}
   */
  read() {
    throw new Error("GilbertR2.read() is not implemented. This adapter is write-only for the initial version.");
  }
  /**
   * @typedef {Object} WriteOptions
   * @property {string} [prefix] - Optional prefix to prepend to all file paths in R2
   * @property {Object} [cacheControl] - Cache control headers configuration
   * @property {number} [cacheControl.html=3600] - Cache duration for HTML files in seconds (default: 1 hour)
   * @property {number} [cacheControl.assets=31536000] - Cache duration for static assets in seconds (default: 1 year)
   * @property {Object} [customMetadata] - Custom metadata to attach to all uploaded objects
   */
  /**
   * Creates a WritableStream for writing GilbertFile objects to R2
   * Uses native R2 streaming API for optimal performance
   * @param {string} [destination="/"] - Destination path prefix in R2 bucket
   * @param {WriteOptions} [options={}] - Optional configuration for writes
   * @returns {WritableStream<GilbertFile>} - WritableStream for uploading files
   */
  write(destination = "/", options = {}) {
    const prefix = options.prefix || destination.replace(/^\//, "");
    const cacheControl = options.cacheControl || {};
    const customMetadata = options.customMetadata || {};
    const bucket = __privateGet(this, _binding);
    const maxFileSize = __privateGet(this, _maxFileSize);
    if (!bucket) {
      throw new Error("GilbertR2: R2 bucket binding is required for write operations. Pass binding in constructor options.");
    }
    return new WritableStream({
      /**
       * Start method called when the stream is created
       */
      start() {
        if (globalThis.GILBERT_DEBUG === "true") {
          logger.debug(`GilbertR2.write: Initialized with prefix: ${prefix}`);
        }
      },
      /**
       * Write method called for each file chunk
       * @param {GilbertFile} file - GilbertFile object to upload to R2
       * @param {WritableStreamDefaultController} controller - Stream controller
       * @returns {Promise<void>}
       */
      async write(file, controller) {
        var _a;
        try {
          await __privateMethod(_a = _GilbertR2, _writeFile, writeFile_fn).call(_a, file, bucket, prefix, maxFileSize, cacheControl, customMetadata);
        } catch (error) {
          console.error(`GilbertR2.write: Error writing file ${file.path}: ${error.message}`);
          controller.error(error);
        }
      },
      /**
       * Close method called when the stream is closed
       */
      close() {
        if (globalThis.GILBERT_DEBUG === "true") {
          logger.debug("GilbertR2.write: Stream closed successfully");
        }
      },
      /**
       * Abort method called when the stream is aborted
       * @param {any} reason - Reason for abort
       */
      abort(reason) {
        console.error("GilbertR2.write: Stream aborted:", reason);
      }
    });
  }
};
var GilbertR2 = _GilbertR2;
__name(GilbertR2, "GilbertR2");
_bucket = new WeakMap();
_binding = new WeakMap();
_maxFileSize = new WeakMap();
_writeFile = new WeakSet();
writeFile_fn = /* @__PURE__ */ __name(async function(file, bucket, prefix, maxFileSize, cacheControl, customMetadata) {
  if (!file || typeof file !== "object") {
    throw new Error("GilbertR2: Invalid file object received");
  }
  if (!file.path) {
    throw new Error("GilbertR2: File object missing path property");
  }
  if (file.isDirectory && file.isDirectory()) {
    return;
  }
  const key = prefix ? `${prefix}/${file.relative}`.replace(/\/+/g, "/") : file.relative;
  if (globalThis.GILBERT_DEBUG === "true") {
    logger.debug(`GilbertR2.#writeFile: prefix="${prefix}", relative="${file.relative}", key="${key}"`);
  }
  let contentStream;
  let contentLength = 0;
  if (file.contents instanceof ReadableStream) {
    const knownSize = file.stat?.size ?? file.size;
    if (knownSize !== null && knownSize !== void 0 && knownSize > 0) {
      contentLength = knownSize;
      const { readable, writable } = new FixedLengthStream(contentLength);
      file.contents.pipeTo(writable).catch((error) => {
        console.error(`GilbertR2: Error piping stream for ${file.path}:`, error);
      });
      contentStream = readable;
    } else {
      const chunks = [];
      const reader = file.contents.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done)
            break;
          chunks.push(value);
          contentLength += value.byteLength;
        }
      } finally {
        reader.releaseLock();
      }
      const combined = new Uint8Array(contentLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }
      contentStream = new ReadableStream({
        start(controller) {
          controller.enqueue(combined);
          controller.close();
        }
      });
    }
  } else if (file.contents instanceof Uint8Array) {
    contentStream = new ReadableStream({
      start(controller) {
        controller.enqueue(file.contents);
        controller.close();
      }
    });
    contentLength = file.contents.length;
  } else if (file.contents === null || file.contents === void 0) {
    contentStream = new ReadableStream({
      start(controller) {
        controller.close();
      }
    });
    contentLength = 0;
  } else {
    throw new Error(`GilbertR2: Unsupported contents type: ${typeof file.contents}`);
  }
  if (contentLength > maxFileSize) {
    throw new Error(`GilbertR2: File ${file.path} exceeds maximum size of ${maxFileSize} bytes (${contentLength} bytes)`);
  }
  const isHtml = file.contentType === "text/html" || file.path.endsWith(".html");
  const cacheSeconds = isHtml ? cacheControl.html || 3600 : cacheControl.assets || 31536e3;
  const httpMetadata = {
    contentType: file.contentType || "application/octet-stream",
    cacheControl: `public, max-age=${cacheSeconds}`
  };
  const metadata = {
    ...customMetadata,
    originalPath: file.path,
    uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    await bucket.put(key, contentStream, {
      httpMetadata,
      customMetadata: metadata
    });
    if (globalThis.GILBERT_DEBUG === "true") {
      logger.debug(`GilbertR2.write: Uploaded ${key} (${contentLength} bytes, cache: ${cacheSeconds}s)`);
    }
  } catch (error) {
    throw new Error(`GilbertR2: Failed to upload ${key} to R2: ${error.message}`);
  }
}, "#writeFile");
/**
 * Private method for writing a single file to R2
 * @param {GilbertFile} file - The file to write
 * @param {R2Bucket} bucket - R2 bucket binding
 * @param {string} prefix - Path prefix for the file
 * @param {number} maxFileSize - Maximum allowed file size
 * @param {Object} cacheControl - Cache control configuration
 * @param {Object} customMetadata - Custom metadata for the object
 * @returns {Promise<void>}
 */
__privateAdd(GilbertR2, _writeFile);

// ../gilbert-file/lib/mime.js
var mimeTypes = { "123": "application/vnd.lotus-1-2-3", "210": "model/step", "ez": "application/andrew-inset", "appinstaller": "application/appinstaller", "aw": "application/applixware", "appx": "application/appx", "appxbundle": "application/appxbundle", "atom": "application/atom+xml", "atomcat": "application/atomcat+xml", "atomdeleted": "application/atomdeleted+xml", "atomsvc": "application/atomsvc+xml", "dwd": "application/atsc-dwd+xml", "held": "application/atsc-held+xml", "rsat": "application/atsc-rsat+xml", "aml": "application/automationml-aml+xml", "amlx": "application/automationml-amlx+zip", "bdoc": "application/x-bdoc", "xcs": "application/calendar+xml", "ccxml": "application/ccxml+xml", "cdfx": "application/cdfx+xml", "cdmia": "application/cdmi-capability", "cdmic": "application/cdmi-container", "cdmid": "application/cdmi-domain", "cdmio": "application/cdmi-object", "cdmiq": "application/cdmi-queue", "cpl": "application/cpl+xml", "cu": "application/cu-seeme", "cwl": "application/cwl", "mpd": "application/dash+xml", "mpp": "application/vnd.ms-project", "davmount": "application/davmount+xml", "dcm": "application/dicom", "dbk": "application/docbook+xml", "dssc": "application/dssc+der", "xdssc": "application/dssc+xml", "ecma": "application/ecmascript", "emma": "application/emma+xml", "emotionml": "application/emotionml+xml", "epub": "application/epub+zip", "exi": "application/exi", "exp": "application/express", "fdf": "application/vnd.fdf", "fdt": "application/fdt+xml", "pfr": "application/font-tdpfr", "geojson": "application/geo+json", "gml": "application/gml+xml", "gpx": "application/gpx+xml", "gxf": "application/gxf", "gz": "application/gzip", "hjson": "application/hjson", "stk": "application/hyperstudio", "ink": "application/inkml+xml", "inkml": "application/inkml+xml", "ipfix": "application/ipfix", "its": "application/its+xml", "jar": "application/java-archive", "war": "application/java-archive", "ear": "application/java-archive", "ser": "application/java-serialized-object", "class": "application/java-vm", "js": "text/javascript", "json": "application/json", "map": "application/json", "json5": "application/json5", "jsonml": "application/jsonml+json", "jsonld": "application/ld+json", "lgr": "application/lgr+xml", "lostxml": "application/lost+xml", "hqx": "application/mac-binhex40", "cpt": "application/mac-compactpro", "mads": "application/mads+xml", "webmanifest": "application/manifest+json", "mrc": "application/marc", "mrcx": "application/marcxml+xml", "ma": "application/mathematica", "nb": "application/mathematica", "mb": "application/mathematica", "mathml": "application/mathml+xml", "mbox": "application/mbox", "mpf": "application/media-policy-dataset+xml", "mscml": "application/mediaservercontrol+xml", "metalink": "application/metalink+xml", "meta4": "application/metalink4+xml", "mets": "application/mets+xml", "maei": "application/mmt-aei+xml", "musd": "application/mmt-usd+xml", "mods": "application/mods+xml", "m21": "application/mp21", "mp21": "application/mp21", "mp4": "video/mp4", "mpg4": "video/mp4", "mp4s": "application/mp4", "m4p": "application/mp4", "msix": "application/msix", "msixbundle": "application/msixbundle", "doc": "application/msword", "dot": "application/msword", "mxf": "application/mxf", "nq": "application/n-quads", "nt": "application/n-triples", "cjs": "application/node", "bin": "application/octet-stream", "dms": "application/octet-stream", "lrf": "application/octet-stream", "mar": "application/octet-stream", "so": "application/octet-stream", "dist": "application/octet-stream", "distz": "application/octet-stream", "pkg": "application/octet-stream", "bpk": "application/octet-stream", "dump": "application/octet-stream", "elc": "application/octet-stream", "deploy": "application/octet-stream", "exe": "application/x-msdownload", "dll": "application/x-msdownload", "deb": "application/x-debian-package", "dmg": "application/x-apple-diskimage", "iso": "application/x-iso9660-image", "img": "application/octet-stream", "msi": "application/x-msdownload", "msp": "application/octet-stream", "msm": "application/octet-stream", "buffer": "application/octet-stream", "oda": "application/oda", "opf": "application/oebps-package+xml", "ogx": "application/ogg", "omdoc": "application/omdoc+xml", "onetoc": "application/onenote", "onetoc2": "application/onenote", "onetmp": "application/onenote", "onepkg": "application/onenote", "one": "application/onenote", "onea": "application/onenote", "oxps": "application/oxps", "relo": "application/p2p-overlay+xml", "xer": "application/patch-ops-error+xml", "pdf": "application/pdf", "pgp": "application/pgp-encrypted", "asc": "application/pgp-signature", "sig": "application/pgp-signature", "prf": "application/pics-rules", "p10": "application/pkcs10", "p7m": "application/pkcs7-mime", "p7c": "application/pkcs7-mime", "p7s": "application/pkcs7-signature", "p8": "application/pkcs8", "ac": "application/vnd.nokia.n-gage.ac+xml", "cer": "application/pkix-cert", "crl": "application/pkix-crl", "pkipath": "application/pkix-pkipath", "pki": "application/pkixcmp", "pls": "application/pls+xml", "ai": "application/postscript", "eps": "application/postscript", "ps": "application/postscript", "provx": "application/provenance+xml", "cww": "application/prs.cww", "xsf": "application/prs.xsf+xml", "pskcxml": "application/pskc+xml", "raml": "application/raml+yaml", "rdf": "application/rdf+xml", "owl": "application/rdf+xml", "rif": "application/reginfo+xml", "rnc": "application/relax-ng-compact-syntax", "rl": "application/resource-lists+xml", "rld": "application/resource-lists-diff+xml", "rs": "application/rls-services+xml", "rapd": "application/route-apd+xml", "sls": "application/route-s-tsid+xml", "rusd": "application/route-usd+xml", "gbr": "application/rpki-ghostbusters", "mft": "application/rpki-manifest", "roa": "application/rpki-roa", "rsd": "application/rsd+xml", "rss": "application/rss+xml", "rtf": "text/rtf", "sbml": "application/sbml+xml", "scq": "application/scvp-cv-request", "scs": "application/scvp-cv-response", "spq": "application/scvp-vp-request", "spp": "application/scvp-vp-response", "sdp": "application/sdp", "senmlx": "application/senml+xml", "sensmlx": "application/sensml+xml", "setpay": "application/set-payment-initiation", "setreg": "application/set-registration-initiation", "shf": "application/shf+xml", "siv": "application/sieve", "sieve": "application/sieve", "smi": "application/smil+xml", "smil": "application/smil+xml", "rq": "application/sparql-query", "srx": "application/sparql-results+xml", "sql": "application/x-sql", "gram": "application/srgs", "grxml": "application/srgs+xml", "sru": "application/sru+xml", "ssdl": "application/ssdl+xml", "ssml": "application/ssml+xml", "swidtag": "application/swid+xml", "tei": "application/tei+xml", "teicorpus": "application/tei+xml", "tfi": "application/thraud+xml", "tsd": "application/timestamped-data", "toml": "application/toml", "trig": "application/trig", "ttml": "application/ttml+xml", "ubj": "application/ubjson", "rsheet": "application/urc-ressheet+xml", "td": "application/urc-targetdesc+xml", "1km": "application/vnd.1000minds.decision-model+xml", "plb": "application/vnd.3gpp.pic-bw-large", "psb": "application/vnd.3gpp.pic-bw-small", "pvb": "application/vnd.3gpp.pic-bw-var", "tcap": "application/vnd.3gpp2.tcap", "pwn": "application/vnd.3m.post-it-notes", "aso": "application/vnd.accpac.simply.aso", "imp": "application/vnd.accpac.simply.imp", "acu": "application/vnd.acucobol", "atc": "application/vnd.acucorp", "acutc": "application/vnd.acucorp", "air": "application/vnd.adobe.air-application-installer-package+zip", "fcdt": "application/vnd.adobe.formscentral.fcdt", "fxp": "application/vnd.adobe.fxp", "fxpl": "application/vnd.adobe.fxp", "xdp": "application/vnd.adobe.xdp+xml", "xfdf": "application/xfdf", "age": "application/vnd.age", "ahead": "application/vnd.ahead.space", "azf": "application/vnd.airzip.filesecure.azf", "azs": "application/vnd.airzip.filesecure.azs", "azw": "application/vnd.amazon.ebook", "acc": "application/vnd.americandynamics.acc", "ami": "application/vnd.amiga.ami", "apk": "application/vnd.android.package-archive", "cii": "application/vnd.anser-web-certificate-issue-initiation", "fti": "application/vnd.anser-web-funds-transfer-initiation", "atx": "application/vnd.antix.game-component", "mpkg": "application/vnd.apple.installer+xml", "key": "application/x-iwork-keynote-sffkey", "m3u8": "application/vnd.apple.mpegurl", "numbers": "application/x-iwork-numbers-sffnumbers", "pages": "application/x-iwork-pages-sffpages", "pkpass": "application/vnd.apple.pkpass", "swi": "application/vnd.aristanetworks.swi", "iota": "application/vnd.astraea-software.iota", "aep": "application/vnd.audiograph", "fbx": "application/vnd.autodesk.fbx", "bmml": "application/vnd.balsamiq.bmml+xml", "mpm": "application/vnd.blueice.multipass", "bmi": "application/vnd.bmi", "rep": "application/vnd.businessobjects", "cdxml": "application/vnd.chemdraw+xml", "mmd": "application/vnd.chipnuts.karaoke-mmd", "cdy": "application/vnd.cinderella", "csl": "application/vnd.citationstyles.style+xml", "cla": "application/vnd.claymore", "rp9": "application/vnd.cloanto.rp9", "c4g": "application/vnd.clonk.c4group", "c4d": "application/vnd.clonk.c4group", "c4f": "application/vnd.clonk.c4group", "c4p": "application/vnd.clonk.c4group", "c4u": "application/vnd.clonk.c4group", "c11amc": "application/vnd.cluetrust.cartomobile-config", "c11amz": "application/vnd.cluetrust.cartomobile-config-pkg", "csp": "application/vnd.commonspace", "cdbcmsg": "application/vnd.contact.cmsg", "cmc": "application/vnd.cosmocaller", "clkx": "application/vnd.crick.clicker", "clkk": "application/vnd.crick.clicker.keyboard", "clkp": "application/vnd.crick.clicker.palette", "clkt": "application/vnd.crick.clicker.template", "clkw": "application/vnd.crick.clicker.wordbank", "wbs": "application/vnd.criticaltools.wbs+xml", "pml": "application/vnd.ctc-posml", "ppd": "application/vnd.cups-ppd", "car": "application/vnd.curl.car", "pcurl": "application/vnd.curl.pcurl", "dart": "application/vnd.dart", "rdz": "application/vnd.data-vision.rdz", "dbf": "application/vnd.dbf", "dcmp": "application/vnd.dcmp+xml", "uvf": "application/vnd.dece.data", "uvvf": "application/vnd.dece.data", "uvd": "application/vnd.dece.data", "uvvd": "application/vnd.dece.data", "uvt": "application/vnd.dece.ttml+xml", "uvvt": "application/vnd.dece.ttml+xml", "uvx": "application/vnd.dece.unspecified", "uvvx": "application/vnd.dece.unspecified", "uvz": "application/vnd.dece.zip", "uvvz": "application/vnd.dece.zip", "fe_launch": "application/vnd.denovo.fcselayout-link", "dna": "application/vnd.dna", "mlp": "application/vnd.dolby.mlp", "dpg": "application/vnd.dpgraph", "dfac": "application/vnd.dreamfactory", "kpxx": "application/vnd.ds-keypoint", "ait": "application/vnd.dvb.ait", "svc": "application/vnd.dvb.service", "geo": "application/vnd.dynageo", "mag": "application/vnd.ecowin.chart", "nml": "application/vnd.enliven", "esf": "application/vnd.epson.esf", "msf": "application/vnd.epson.msf", "qam": "application/vnd.epson.quickanime", "slt": "application/vnd.epson.salt", "ssf": "application/vnd.epson.ssf", "es3": "application/vnd.eszigno3+xml", "et3": "application/vnd.eszigno3+xml", "ez2": "application/vnd.ezpix-album", "ez3": "application/vnd.ezpix-package", "mseed": "application/vnd.fdsn.mseed", "seed": "application/vnd.fdsn.seed", "dataless": "application/vnd.fdsn.seed", "gph": "application/vnd.flographit", "ftc": "application/vnd.fluxtime.clip", "fm": "application/vnd.framemaker", "frame": "application/vnd.framemaker", "maker": "application/vnd.framemaker", "book": "application/vnd.framemaker", "fnc": "application/vnd.frogans.fnc", "ltf": "application/vnd.frogans.ltf", "fsc": "application/vnd.fsc.weblaunch", "oas": "application/vnd.fujitsu.oasys", "oa2": "application/vnd.fujitsu.oasys2", "oa3": "application/vnd.fujitsu.oasys3", "fg5": "application/vnd.fujitsu.oasysgp", "bh2": "application/vnd.fujitsu.oasysprs", "ddd": "application/vnd.fujixerox.ddd", "xdw": "application/vnd.fujixerox.docuworks", "xbd": "application/vnd.fujixerox.docuworks.binder", "fzs": "application/vnd.fuzzysheet", "txd": "application/vnd.genomatix.tuxedo", "ggb": "application/vnd.geogebra.file", "ggs": "application/vnd.geogebra.slides", "ggt": "application/vnd.geogebra.tool", "gex": "application/vnd.geometry-explorer", "gre": "application/vnd.geometry-explorer", "gxt": "application/vnd.geonext", "g2w": "application/vnd.geoplan", "g3w": "application/vnd.geospace", "gmx": "application/vnd.gmx", "gdoc": "application/vnd.google-apps.document", "gdraw": "application/vnd.google-apps.drawing", "gform": "application/vnd.google-apps.form", "gjam": "application/vnd.google-apps.jam", "gmap": "application/vnd.google-apps.map", "gslides": "application/vnd.google-apps.presentation", "gscript": "application/vnd.google-apps.script", "gsite": "application/vnd.google-apps.site", "gsheet": "application/vnd.google-apps.spreadsheet", "kml": "application/vnd.google-earth.kml+xml", "kmz": "application/vnd.google-earth.kmz", "xdcf": "application/vnd.gov.sk.xmldatacontainer+xml", "gqf": "application/vnd.grafeq", "gqs": "application/vnd.grafeq", "gac": "application/vnd.groove-account", "ghf": "application/vnd.groove-help", "gim": "application/vnd.groove-identity-message", "grv": "application/vnd.groove-injector", "gtm": "application/vnd.groove-tool-message", "tpl": "application/vnd.groove-tool-template", "vcg": "application/vnd.groove-vcard", "hal": "application/vnd.hal+xml", "zmm": "application/vnd.handheld-entertainment+xml", "hbci": "application/vnd.hbci", "les": "application/vnd.hhe.lesson-player", "hpgl": "application/vnd.hp-hpgl", "hpid": "application/vnd.hp-hpid", "hps": "application/vnd.hp-hps", "jlt": "application/vnd.hp-jlyt", "pcl": "application/vnd.hp-pcl", "pclxl": "application/vnd.hp-pclxl", "sfd-hdstx": "application/vnd.hydrostatix.sof-data", "mpy": "application/vnd.ibm.minipay", "afp": "application/vnd.ibm.modcap", "listafp": "application/vnd.ibm.modcap", "list3820": "application/vnd.ibm.modcap", "irm": "application/vnd.ibm.rights-management", "sc": "application/vnd.ibm.secure-container", "icc": "application/vnd.iccprofile", "icm": "application/vnd.iccprofile", "igl": "application/vnd.igloader", "ivp": "application/vnd.immervision-ivp", "ivu": "application/vnd.immervision-ivu", "igm": "application/vnd.insors.igm", "xpw": "application/vnd.intercon.formnet", "xpx": "application/vnd.intercon.formnet", "i2g": "application/vnd.intergeo", "qbo": "application/vnd.intu.qbo", "qfx": "application/vnd.intu.qfx", "rcprofile": "application/vnd.ipunplugged.rcprofile", "irp": "application/vnd.irepository.package+xml", "xpr": "application/vnd.is-xpr", "fcs": "application/vnd.isac.fcs", "jam": "application/vnd.jam", "rms": "application/vnd.jcp.javame.midlet-rms", "jisp": "application/vnd.jisp", "joda": "application/vnd.joost.joda-archive", "ktz": "application/vnd.kahootz", "ktr": "application/vnd.kahootz", "karbon": "application/vnd.kde.karbon", "chrt": "application/vnd.kde.kchart", "kfo": "application/vnd.kde.kformula", "flw": "application/vnd.kde.kivio", "kon": "application/vnd.kde.kontour", "kpr": "application/vnd.kde.kpresenter", "kpt": "application/vnd.kde.kpresenter", "ksp": "application/vnd.kde.kspread", "kwd": "application/vnd.kde.kword", "kwt": "application/vnd.kde.kword", "htke": "application/vnd.kenameaapp", "kia": "application/vnd.kidspiration", "kne": "application/vnd.kinar", "knp": "application/vnd.kinar", "skp": "application/vnd.koan", "skd": "application/vnd.koan", "skt": "application/vnd.koan", "skm": "application/vnd.koan", "sse": "application/vnd.kodak-descriptor", "lasxml": "application/vnd.las.las+xml", "lbd": "application/vnd.llamagraphics.life-balance.desktop", "lbe": "application/vnd.llamagraphics.life-balance.exchange+xml", "apr": "application/vnd.lotus-approach", "pre": "application/vnd.lotus-freelance", "nsf": "application/vnd.lotus-notes", "org": "text/x-org", "scm": "application/vnd.lotus-screencam", "lwp": "application/vnd.lotus-wordpro", "portpkg": "application/vnd.macports.portpkg", "mvt": "application/vnd.mapbox-vector-tile", "mcd": "application/vnd.mcd", "mc1": "application/vnd.medcalcdata", "cdkey": "application/vnd.mediastation.cdkey", "mwf": "application/vnd.mfer", "mfm": "application/vnd.mfmp", "flo": "application/vnd.micrografx.flo", "igx": "application/vnd.micrografx.igx", "mif": "application/vnd.mif", "daf": "application/vnd.mobius.daf", "dis": "application/vnd.mobius.dis", "mbk": "application/vnd.mobius.mbk", "mqy": "application/vnd.mobius.mqy", "msl": "application/vnd.mobius.msl", "plc": "application/vnd.mobius.plc", "txf": "application/vnd.mobius.txf", "mpn": "application/vnd.mophun.application", "mpc": "application/vnd.mophun.certificate", "xul": "application/vnd.mozilla.xul+xml", "cil": "application/vnd.ms-artgalry", "cab": "application/vnd.ms-cab-compressed", "xls": "application/vnd.ms-excel", "xlm": "application/vnd.ms-excel", "xla": "application/vnd.ms-excel", "xlc": "application/vnd.ms-excel", "xlt": "application/vnd.ms-excel", "xlw": "application/vnd.ms-excel", "xlam": "application/vnd.ms-excel.addin.macroenabled.12", "xlsb": "application/vnd.ms-excel.sheet.binary.macroenabled.12", "xlsm": "application/vnd.ms-excel.sheet.macroenabled.12", "xltm": "application/vnd.ms-excel.template.macroenabled.12", "eot": "application/vnd.ms-fontobject", "chm": "application/vnd.ms-htmlhelp", "ims": "application/vnd.ms-ims", "lrm": "application/vnd.ms-lrm", "thmx": "application/vnd.ms-officetheme", "msg": "application/vnd.ms-outlook", "cat": "application/vnd.ms-pki.seccat", "stl": "model/stl", "ppt": "application/vnd.ms-powerpoint", "pps": "application/vnd.ms-powerpoint", "pot": "application/vnd.ms-powerpoint", "ppam": "application/vnd.ms-powerpoint.addin.macroenabled.12", "pptm": "application/vnd.ms-powerpoint.presentation.macroenabled.12", "sldm": "application/vnd.ms-powerpoint.slide.macroenabled.12", "ppsm": "application/vnd.ms-powerpoint.slideshow.macroenabled.12", "potm": "application/vnd.ms-powerpoint.template.macroenabled.12", "mpt": "application/vnd.ms-project", "vdx": "application/vnd.ms-visio.viewer", "docm": "application/vnd.ms-word.document.macroenabled.12", "dotm": "application/vnd.ms-word.template.macroenabled.12", "wps": "application/vnd.ms-works", "wks": "application/vnd.ms-works", "wcm": "application/vnd.ms-works", "wdb": "application/vnd.ms-works", "wpl": "application/vnd.ms-wpl", "xps": "application/vnd.ms-xpsdocument", "mseq": "application/vnd.mseq", "mus": "application/vnd.musician", "msty": "application/vnd.muvee.style", "taglet": "application/vnd.mynfc", "bdo": "application/vnd.nato.bindingdataobject+xml", "nlu": "application/vnd.neurolanguage.nlu", "ntf": "application/vnd.nitf", "nitf": "application/vnd.nitf", "nnd": "application/vnd.noblenet-directory", "nns": "application/vnd.noblenet-sealer", "nnw": "application/vnd.noblenet-web", "ngdat": "application/vnd.nokia.n-gage.data", "n-gage": "application/vnd.nokia.n-gage.symbian.install", "rpst": "application/vnd.nokia.radio-preset", "rpss": "application/vnd.nokia.radio-presets", "edm": "application/vnd.novadigm.edm", "edx": "application/vnd.novadigm.edx", "ext": "application/vnd.novadigm.ext", "odc": "application/vnd.oasis.opendocument.chart", "otc": "application/vnd.oasis.opendocument.chart-template", "odb": "application/vnd.oasis.opendocument.database", "odf": "application/vnd.oasis.opendocument.formula", "odft": "application/vnd.oasis.opendocument.formula-template", "odg": "application/vnd.oasis.opendocument.graphics", "otg": "application/vnd.oasis.opendocument.graphics-template", "odi": "application/vnd.oasis.opendocument.image", "oti": "application/vnd.oasis.opendocument.image-template", "odp": "application/vnd.oasis.opendocument.presentation", "otp": "application/vnd.oasis.opendocument.presentation-template", "ods": "application/vnd.oasis.opendocument.spreadsheet", "ots": "application/vnd.oasis.opendocument.spreadsheet-template", "odt": "application/vnd.oasis.opendocument.text", "odm": "application/vnd.oasis.opendocument.text-master", "ott": "application/vnd.oasis.opendocument.text-template", "oth": "application/vnd.oasis.opendocument.text-web", "xo": "application/vnd.olpc-sugar", "dd2": "application/vnd.oma.dd2+xml", "obgx": "application/vnd.openblox.game+xml", "oxt": "application/vnd.openofficeorg.extension", "osm": "application/vnd.openstreetmap.data+xml", "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "sldx": "application/vnd.openxmlformats-officedocument.presentationml.slide", "ppsx": "application/vnd.openxmlformats-officedocument.presentationml.slideshow", "potx": "application/vnd.openxmlformats-officedocument.presentationml.template", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xltx": "application/vnd.openxmlformats-officedocument.spreadsheetml.template", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "dotx": "application/vnd.openxmlformats-officedocument.wordprocessingml.template", "mgp": "application/vnd.osgeo.mapguide.package", "dp": "application/vnd.osgi.dp", "esa": "application/vnd.osgi.subsystem", "pdb": "application/x-pilot", "pqa": "application/vnd.palm", "oprc": "application/vnd.palm", "paw": "application/vnd.pawaafile", "str": "application/vnd.pg.format", "ei6": "application/vnd.pg.osasli", "efif": "application/vnd.picsel", "wg": "application/vnd.pmi.widget", "plf": "application/vnd.pocketlearn", "pbd": "application/vnd.powerbuilder6", "box": "application/vnd.previewsystems.box", "brushset": "application/vnd.procrate.brushset", "brush": "application/vnd.procreate.brush", "drm": "application/vnd.procreate.dream", "mgz": "application/vnd.proteus.magazine", "qps": "application/vnd.publishare-delta-tree", "ptid": "application/vnd.pvi.ptid1", "xhtm": "application/vnd.pwg-xhtml-print+xml", "qxd": "application/vnd.quark.quarkxpress", "qxt": "application/vnd.quark.quarkxpress", "qwd": "application/vnd.quark.quarkxpress", "qwt": "application/vnd.quark.quarkxpress", "qxl": "application/vnd.quark.quarkxpress", "qxb": "application/vnd.quark.quarkxpress", "rar": "application/x-rar-compressed", "bed": "application/vnd.realvnc.bed", "mxl": "application/vnd.recordare.musicxml", "musicxml": "application/vnd.recordare.musicxml+xml", "cryptonote": "application/vnd.rig.cryptonote", "cod": "application/vnd.rim.cod", "rm": "application/vnd.rn-realmedia", "rmvb": "application/vnd.rn-realmedia-vbr", "link66": "application/vnd.route66.link66+xml", "st": "application/vnd.sailingtracker.track", "see": "application/vnd.seemail", "sema": "application/vnd.sema", "semd": "application/vnd.semd", "semf": "application/vnd.semf", "ifm": "application/vnd.shana.informed.formdata", "itp": "application/vnd.shana.informed.formtemplate", "iif": "application/vnd.shana.informed.interchange", "ipk": "application/vnd.shana.informed.package", "twd": "application/vnd.simtech-mindmapper", "twds": "application/vnd.simtech-mindmapper", "mmf": "application/vnd.smaf", "teacher": "application/vnd.smart.teacher", "fo": "application/vnd.software602.filler.form+xml", "sdkm": "application/vnd.solent.sdkm+xml", "sdkd": "application/vnd.solent.sdkm+xml", "dxp": "application/vnd.spotfire.dxp", "sfs": "application/vnd.spotfire.sfs", "sdc": "application/vnd.stardivision.calc", "sda": "application/vnd.stardivision.draw", "sdd": "application/vnd.stardivision.impress", "smf": "application/vnd.stardivision.math", "sdw": "application/vnd.stardivision.writer", "vor": "application/vnd.stardivision.writer", "sgl": "application/vnd.stardivision.writer-global", "smzip": "application/vnd.stepmania.package", "sm": "application/vnd.stepmania.stepchart", "wadl": "application/vnd.sun.wadl+xml", "sxc": "application/vnd.sun.xml.calc", "stc": "application/vnd.sun.xml.calc.template", "sxd": "application/vnd.sun.xml.draw", "std": "application/vnd.sun.xml.draw.template", "sxi": "application/vnd.sun.xml.impress", "sti": "application/vnd.sun.xml.impress.template", "sxm": "application/vnd.sun.xml.math", "sxw": "application/vnd.sun.xml.writer", "sxg": "application/vnd.sun.xml.writer.global", "stw": "application/vnd.sun.xml.writer.template", "sus": "application/vnd.sus-calendar", "susp": "application/vnd.sus-calendar", "svd": "application/vnd.svd", "sis": "application/vnd.symbian.install", "sisx": "application/vnd.symbian.install", "xsm": "application/vnd.syncml+xml", "bdm": "application/vnd.syncml.dm+wbxml", "xdm": "application/vnd.syncml.dm+xml", "ddf": "application/vnd.syncml.dmddf+xml", "tao": "application/vnd.tao.intent-module-archive", "pcap": "application/vnd.tcpdump.pcap", "cap": "application/vnd.tcpdump.pcap", "dmp": "application/vnd.tcpdump.pcap", "tmo": "application/vnd.tmobile-livetv", "tpt": "application/vnd.trid.tpt", "mxs": "application/vnd.triscape.mxs", "tra": "application/vnd.trueapp", "ufd": "application/vnd.ufdl", "ufdl": "application/vnd.ufdl", "utz": "application/vnd.uiq.theme", "umj": "application/vnd.umajin", "unityweb": "application/vnd.unity", "uoml": "application/vnd.uoml+xml", "uo": "application/vnd.uoml+xml", "vcx": "application/vnd.vcx", "vsd": "application/vnd.visio", "vst": "application/vnd.visio", "vss": "application/vnd.visio", "vsw": "application/vnd.visio", "vsdx": "application/vnd.visio", "vtx": "application/vnd.visio", "vis": "application/vnd.visionary", "vsf": "application/vnd.vsf", "wbxml": "application/vnd.wap.wbxml", "wmlc": "application/vnd.wap.wmlc", "wmlsc": "application/vnd.wap.wmlscriptc", "wtb": "application/vnd.webturbo", "nbp": "application/vnd.wolfram.player", "wpd": "application/vnd.wordperfect", "wqd": "application/vnd.wqd", "stf": "application/vnd.wt.stf", "xar": "application/vnd.xara", "xfdl": "application/vnd.xfdl", "hvd": "application/vnd.yamaha.hv-dic", "hvs": "application/vnd.yamaha.hv-script", "hvp": "application/vnd.yamaha.hv-voice", "osf": "application/vnd.yamaha.openscoreformat", "osfpvg": "application/vnd.yamaha.openscoreformat.osfpvg+xml", "saf": "application/vnd.yamaha.smaf-audio", "spf": "application/vnd.yamaha.smaf-phrase", "cmp": "application/vnd.yellowriver-custom-menu", "zir": "application/vnd.zul", "zirz": "application/vnd.zul", "zaz": "application/vnd.zzazz.deck+xml", "vxml": "application/voicexml+xml", "wasm": "application/wasm", "wif": "application/watcherinfo+xml", "wgt": "application/widget", "hlp": "application/winhlp", "wsdl": "application/wsdl+xml", "wspolicy": "application/wspolicy+xml", "7z": "application/x-7z-compressed", "abw": "application/x-abiword", "ace": "application/x-ace-compressed", "arj": "application/x-arj", "aab": "application/x-authorware-bin", "x32": "application/x-authorware-bin", "u32": "application/x-authorware-bin", "vox": "application/x-authorware-bin", "aam": "application/x-authorware-map", "aas": "application/x-authorware-seg", "bcpio": "application/x-bcpio", "torrent": "application/x-bittorrent", "blend": "application/x-blender", "blb": "application/x-blorb", "blorb": "application/x-blorb", "bz": "application/x-bzip", "bz2": "application/x-bzip2", "boz": "application/x-bzip2", "cbr": "application/x-cbr", "cba": "application/x-cbr", "cbt": "application/x-cbr", "cbz": "application/x-cbr", "cb7": "application/x-cbr", "vcd": "application/x-cdlink", "cfs": "application/x-cfs-compressed", "chat": "application/x-chat", "pgn": "application/x-chess-pgn", "crx": "application/x-chrome-extension", "cco": "application/x-cocoa", "nsc": "application/x-conference", "cpio": "application/x-cpio", "csh": "application/x-csh", "udeb": "application/x-debian-package", "dgc": "application/x-dgc-compressed", "dir": "application/x-director", "dcr": "application/x-director", "dxr": "application/x-director", "cst": "application/x-director", "cct": "application/x-director", "cxt": "application/x-director", "w3d": "application/x-director", "fgd": "application/x-director", "swa": "application/x-director", "wad": "application/x-doom", "ncx": "application/x-dtbncx+xml", "dtb": "application/x-dtbook+xml", "res": "application/x-dtbresource+xml", "dvi": "application/x-dvi", "evy": "application/x-envoy", "eva": "application/x-eva", "bdf": "application/x-font-bdf", "gsf": "application/x-font-ghostscript", "psf": "application/x-font-linux-psf", "pcf": "application/x-font-pcf", "snf": "application/x-font-snf", "pfa": "application/x-font-type1", "pfb": "application/x-font-type1", "pfm": "application/x-font-type1", "afm": "application/x-font-type1", "arc": "application/x-freearc", "spl": "application/x-futuresplash", "gca": "application/x-gca-compressed", "ulx": "application/x-glulx", "gnumeric": "application/x-gnumeric", "gramps": "application/x-gramps-xml", "gtar": "application/x-gtar", "hdf": "application/x-hdf", "php": "application/x-httpd-php", "install": "application/x-install-instructions", "ipynb": "application/x-ipynb+json", "jardiff": "application/x-java-archive-diff", "jnlp": "application/x-java-jnlp-file", "kdbx": "application/x-keepass2", "latex": "application/x-latex", "luac": "application/x-lua-bytecode", "lzh": "application/x-lzh-compressed", "lha": "application/x-lzh-compressed", "run": "application/x-makeself", "mie": "application/x-mie", "prc": "model/prc", "mobi": "application/x-mobipocket-ebook", "application": "application/x-ms-application", "lnk": "application/x-ms-shortcut", "wmd": "application/x-ms-wmd", "wmz": "application/x-msmetafile", "xbap": "application/x-ms-xbap", "mdb": "application/x-msaccess", "obd": "application/x-msbinder", "crd": "application/x-mscardfile", "clp": "application/x-msclip", "com": "application/x-msdownload", "bat": "application/x-msdownload", "mvb": "application/x-msmediaview", "m13": "application/x-msmediaview", "m14": "application/x-msmediaview", "wmf": "image/wmf", "emf": "image/emf", "emz": "application/x-msmetafile", "mny": "application/x-msmoney", "pub": "application/x-mspublisher", "scd": "application/x-msschedule", "trm": "application/x-msterminal", "wri": "application/x-mswrite", "nc": "application/x-netcdf", "cdf": "application/x-netcdf", "pac": "application/x-ns-proxy-autoconfig", "nzb": "application/x-nzb", "pl": "application/x-perl", "pm": "application/x-perl", "p12": "application/x-pkcs12", "pfx": "application/x-pkcs12", "p7b": "application/x-pkcs7-certificates", "spc": "application/x-pkcs7-certificates", "p7r": "application/x-pkcs7-certreqresp", "rpm": "application/x-redhat-package-manager", "ris": "application/x-research-info-systems", "sea": "application/x-sea", "sh": "application/x-sh", "shar": "application/x-shar", "swf": "application/x-shockwave-flash", "xap": "application/x-silverlight-app", "sit": "application/x-stuffit", "sitx": "application/x-stuffitx", "srt": "application/x-subrip", "sv4cpio": "application/x-sv4cpio", "sv4crc": "application/x-sv4crc", "t3": "application/x-t3vm-image", "gam": "application/x-tads", "tar": "application/x-tar", "tcl": "application/x-tcl", "tk": "application/x-tcl", "tex": "application/x-tex", "tfm": "application/x-tex-tfm", "texinfo": "application/x-texinfo", "texi": "application/x-texinfo", "obj": "model/obj", "ustar": "application/x-ustar", "hdd": "application/x-virtualbox-hdd", "ova": "application/x-virtualbox-ova", "ovf": "application/x-virtualbox-ovf", "vbox": "application/x-virtualbox-vbox", "vbox-extpack": "application/x-virtualbox-vbox-extpack", "vdi": "application/x-virtualbox-vdi", "vhd": "application/x-virtualbox-vhd", "vmdk": "application/x-virtualbox-vmdk", "src": "application/x-wais-source", "webapp": "application/x-web-app-manifest+json", "der": "application/x-x509-ca-cert", "crt": "application/x-x509-ca-cert", "pem": "application/x-x509-ca-cert", "fig": "application/x-xfig", "xlf": "application/xliff+xml", "xpi": "application/x-xpinstall", "xz": "application/x-xz", "zip": "application/zip", "z1": "application/x-zmachine", "z2": "application/x-zmachine", "z3": "application/x-zmachine", "z4": "application/x-zmachine", "z5": "application/x-zmachine", "z6": "application/x-zmachine", "z7": "application/x-zmachine", "z8": "application/x-zmachine", "xaml": "application/xaml+xml", "xav": "application/xcap-att+xml", "xca": "application/xcap-caps+xml", "xdf": "application/xcap-diff+xml", "xel": "application/xcap-el+xml", "xns": "application/xcap-ns+xml", "xenc": "application/xenc+xml", "xhtml": "application/xhtml+xml", "xht": "application/xhtml+xml", "xml": "text/xml", "xsl": "application/xslt+xml", "xsd": "application/xml", "rng": "application/xml", "dtd": "application/xml-dtd", "xop": "application/xop+xml", "xpl": "application/xproc+xml", "xslt": "application/xslt+xml", "xspf": "application/xspf+xml", "mxml": "application/xv+xml", "xhvml": "application/xv+xml", "xvml": "application/xv+xml", "xvm": "application/xv+xml", "yang": "application/yang", "yin": "application/yin+xml", "lottie": "application/zip+dotlottie", "3gpp": "video/3gpp", "adts": "audio/aac", "aac": "audio/x-aac", "adp": "audio/adpcm", "amr": "audio/amr", "au": "audio/basic", "snd": "audio/basic", "mid": "audio/midi", "midi": "audio/midi", "kar": "audio/midi", "rmi": "audio/midi", "mxmf": "audio/mobile-xmf", "mp3": "audio/mpeg", "m4a": "audio/x-m4a", "mp4a": "audio/mp4", "m4b": "audio/mp4", "mpga": "audio/mpeg", "mp2": "audio/mpeg", "mp2a": "audio/mpeg", "m2a": "audio/mpeg", "m3a": "audio/mpeg", "oga": "audio/ogg", "ogg": "audio/ogg", "spx": "audio/ogg", "opus": "audio/ogg", "s3m": "audio/s3m", "sil": "audio/silk", "uva": "audio/vnd.dece.audio", "uvva": "audio/vnd.dece.audio", "eol": "audio/vnd.digital-winds", "dra": "audio/vnd.dra", "dts": "audio/vnd.dts", "dtshd": "audio/vnd.dts.hd", "lvp": "audio/vnd.lucent.voice", "pya": "audio/vnd.ms-playready.media.pya", "ecelp4800": "audio/vnd.nuera.ecelp4800", "ecelp7470": "audio/vnd.nuera.ecelp7470", "ecelp9600": "audio/vnd.nuera.ecelp9600", "rip": "audio/vnd.rip", "wav": "audio/x-wav", "weba": "audio/webm", "aif": "audio/x-aiff", "aiff": "audio/x-aiff", "aifc": "audio/x-aiff", "caf": "audio/x-caf", "flac": "audio/x-flac", "mka": "audio/x-matroska", "m3u": "audio/x-mpegurl", "wax": "audio/x-ms-wax", "wma": "audio/x-ms-wma", "ram": "audio/x-pn-realaudio", "ra": "audio/x-realaudio", "rmp": "audio/x-pn-realaudio-plugin", "xm": "audio/xm", "cdx": "chemical/x-cdx", "cif": "chemical/x-cif", "cmdf": "chemical/x-cmdf", "cml": "chemical/x-cml", "csml": "chemical/x-csml", "xyz": "chemical/x-xyz", "ttc": "font/collection", "otf": "font/otf", "ttf": "font/ttf", "woff": "font/woff", "woff2": "font/woff2", "exr": "image/aces", "apng": "image/apng", "avci": "image/avci", "avcs": "image/avcs", "avif": "image/avif", "bmp": "image/x-ms-bmp", "dib": "image/bmp", "cgm": "image/cgm", "drle": "image/dicom-rle", "dpx": "image/dpx", "fits": "image/fits", "g3": "image/g3fax", "gif": "image/gif", "heic": "image/heic", "heics": "image/heic-sequence", "heif": "image/heif", "heifs": "image/heif-sequence", "hej2": "image/hej2k", "ief": "image/ief", "jaii": "image/jaii", "jais": "image/jais", "jls": "image/jls", "jp2": "image/jp2", "jpg2": "image/jp2", "jpg": "image/jpeg", "jpeg": "image/jpeg", "jpe": "image/jpeg", "jph": "image/jph", "jhc": "image/jphc", "jpm": "video/jpm", "jpgm": "video/jpm", "jpx": "image/jpx", "jpf": "image/jpx", "jxl": "image/jxl", "jxr": "image/jxr", "jxra": "image/jxra", "jxrs": "image/jxrs", "jxs": "image/jxs", "jxsc": "image/jxsc", "jxsi": "image/jxsi", "jxss": "image/jxss", "ktx": "image/ktx", "ktx2": "image/ktx2", "jfif": "image/pjpeg", "png": "image/png", "btif": "image/prs.btif", "btf": "image/prs.btif", "pti": "image/prs.pti", "sgi": "image/sgi", "svg": "image/svg+xml", "svgz": "image/svg+xml", "t38": "image/t38", "tif": "image/tiff", "tiff": "image/tiff", "tfx": "image/tiff-fx", "psd": "image/vnd.adobe.photoshop", "azv": "image/vnd.airzip.accelerator.azv", "uvi": "image/vnd.dece.graphic", "uvvi": "image/vnd.dece.graphic", "uvg": "image/vnd.dece.graphic", "uvvg": "image/vnd.dece.graphic", "djvu": "image/vnd.djvu", "djv": "image/vnd.djvu", "sub": "text/vnd.dvb.subtitle", "dwg": "image/vnd.dwg", "dxf": "image/vnd.dxf", "fbs": "image/vnd.fastbidsheet", "fpx": "image/vnd.fpx", "fst": "image/vnd.fst", "mmr": "image/vnd.fujixerox.edmics-mmr", "rlc": "image/vnd.fujixerox.edmics-rlc", "ico": "image/x-icon", "dds": "image/vnd.ms-dds", "mdi": "image/vnd.ms-modi", "wdp": "image/vnd.ms-photo", "npx": "image/vnd.net-fpx", "b16": "image/vnd.pco.b16", "tap": "image/vnd.tencent.tap", "vtf": "image/vnd.valve.source.texture", "wbmp": "image/vnd.wap.wbmp", "xif": "image/vnd.xiff", "pcx": "image/x-pcx", "webp": "image/webp", "3ds": "image/x-3ds", "dng": "image/x-adobe-dng", "ras": "image/x-cmu-raster", "cmx": "image/x-cmx", "fh": "image/x-freehand", "fhc": "image/x-freehand", "fh4": "image/x-freehand", "fh5": "image/x-freehand", "fh7": "image/x-freehand", "jng": "image/x-jng", "sid": "image/x-mrsid-image", "pic": "image/x-pict", "pct": "image/x-pict", "pnm": "image/x-portable-anymap", "pbm": "image/x-portable-bitmap", "pgm": "image/x-portable-graymap", "ppm": "image/x-portable-pixmap", "rgb": "image/x-rgb", "tga": "image/x-tga", "xbm": "image/x-xbitmap", "xpm": "image/x-xpixmap", "xwd": "image/x-xwindowdump", "disposition-notification": "message/disposition-notification", "u8msg": "message/global", "u8dsn": "message/global-delivery-status", "u8mdn": "message/global-disposition-notification", "u8hdr": "message/global-headers", "eml": "message/rfc822", "mime": "message/rfc822", "mht": "message/rfc822", "mhtml": "message/rfc822", "wsc": "message/vnd.wfa.wsc", "3mf": "model/3mf", "gltf": "model/gltf+json", "glb": "model/gltf-binary", "igs": "model/iges", "iges": "model/iges", "jt": "model/jt", "msh": "model/mesh", "mesh": "model/mesh", "silo": "model/mesh", "mtl": "model/mtl", "step": "model/step", "stp": "model/step", "stpnc": "model/step", "p21": "model/step", "stpx": "model/step+xml", "stpz": "model/step+zip", "stpxz": "model/step-xml+zip", "u3d": "model/u3d", "bary": "model/vnd.bary", "cld": "model/vnd.cld", "dae": "model/vnd.collada+xml", "dwf": "model/vnd.dwf", "gdl": "model/vnd.gdl", "gtw": "model/vnd.gtw", "mts": "video/mp2t", "ogex": "model/vnd.opengex", "x_b": "model/vnd.parasolid.transmit.binary", "x_t": "model/vnd.parasolid.transmit.text", "pyo": "model/vnd.pytha.pyox", "pyox": "model/vnd.pytha.pyox", "vds": "model/vnd.sap.vds", "usda": "model/vnd.usda", "usdz": "model/vnd.usdz+zip", "bsp": "model/vnd.valve.source.compiled-map", "vtu": "model/vnd.vtu", "wrl": "model/vrml", "vrml": "model/vrml", "x3db": "model/x3d+fastinfoset", "x3dbz": "model/x3d+binary", "x3dv": "model/x3d-vrml", "x3dvz": "model/x3d+vrml", "x3d": "model/x3d+xml", "x3dz": "model/x3d+xml", "appcache": "text/cache-manifest", "manifest": "text/cache-manifest", "ics": "text/calendar", "ifb": "text/calendar", "coffee": "text/coffeescript", "litcoffee": "text/coffeescript", "css": "text/css", "csv": "text/csv", "html": "text/html", "htm": "text/html", "shtml": "text/html", "jade": "text/jade", "mjs": "text/javascript", "jsx": "text/jsx", "less": "text/less", "md": "text/markdown", "markdown": "text/markdown", "mml": "text/mathml", "mdx": "text/mdx", "n3": "text/n3", "txt": "text/plain", "text": "text/plain", "conf": "text/plain", "def": "text/plain", "list": "text/plain", "log": "text/plain", "in": "text/plain", "ini": "text/plain", "dsc": "text/prs.lines.tag", "rtx": "text/richtext", "sgml": "text/sgml", "sgm": "text/sgml", "shex": "text/shex", "slim": "text/slim", "slm": "text/slim", "spdx": "text/spdx", "stylus": "text/stylus", "styl": "text/stylus", "tsv": "text/tab-separated-values", "t": "text/troff", "tr": "text/troff", "roff": "text/troff", "man": "text/troff", "me": "text/troff", "ms": "text/troff", "ttl": "text/turtle", "uri": "text/uri-list", "uris": "text/uri-list", "urls": "text/uri-list", "vcard": "text/vcard", "curl": "text/vnd.curl", "dcurl": "text/vnd.curl.dcurl", "mcurl": "text/vnd.curl.mcurl", "scurl": "text/vnd.curl.scurl", "ged": "text/vnd.familysearch.gedcom", "fly": "text/vnd.fly", "flx": "text/vnd.fmi.flexstor", "gv": "text/vnd.graphviz", "3dml": "text/vnd.in3d.3dml", "spot": "text/vnd.in3d.spot", "jad": "text/vnd.sun.j2me.app-descriptor", "wml": "text/vnd.wap.wml", "wmls": "text/vnd.wap.wmlscript", "vtt": "text/vtt", "wgsl": "text/wgsl", "s": "text/x-asm", "asm": "text/x-asm", "c": "text/x-c", "cc": "text/x-c", "cxx": "text/x-c", "cpp": "text/x-c", "h": "text/x-c", "hh": "text/x-c", "dic": "text/x-c", "htc": "text/x-component", "f": "text/x-fortran", "for": "text/x-fortran", "f77": "text/x-fortran", "f90": "text/x-fortran", "hbs": "text/x-handlebars-template", "java": "text/x-java-source", "lua": "text/x-lua", "mkd": "text/x-markdown", "nfo": "text/x-nfo", "opml": "text/x-opml", "p": "text/x-pascal", "pas": "text/x-pascal", "pde": "text/x-processing", "sass": "text/x-sass", "scss": "text/x-scss", "etx": "text/x-setext", "sfv": "text/x-sfv", "ymp": "text/x-suse-ymp", "uu": "text/x-uuencode", "vcs": "text/x-vcalendar", "vcf": "text/x-vcard", "yaml": "text/yaml", "yml": "text/yaml", "3gp": "video/3gpp", "3g2": "video/3gpp2", "h261": "video/h261", "h263": "video/h263", "h264": "video/h264", "m4s": "video/iso.segment", "jpgv": "video/jpeg", "mj2": "video/mj2", "mjp2": "video/mj2", "ts": "video/mp2t", "m2t": "video/mp2t", "m2ts": "video/mp2t", "mp4v": "video/mp4", "mpeg": "video/mpeg", "mpg": "video/mpeg", "mpe": "video/mpeg", "m1v": "video/mpeg", "m2v": "video/mpeg", "ogv": "video/ogg", "qt": "video/quicktime", "mov": "video/quicktime", "uvh": "video/vnd.dece.hd", "uvvh": "video/vnd.dece.hd", "uvm": "video/vnd.dece.mobile", "uvvm": "video/vnd.dece.mobile", "uvp": "video/vnd.dece.pd", "uvvp": "video/vnd.dece.pd", "uvs": "video/vnd.dece.sd", "uvvs": "video/vnd.dece.sd", "uvv": "video/vnd.dece.video", "uvvv": "video/vnd.dece.video", "dvb": "video/vnd.dvb.file", "fvt": "video/vnd.fvt", "mxu": "video/vnd.mpegurl", "m4u": "video/vnd.mpegurl", "pyv": "video/vnd.ms-playready.media.pyv", "uvu": "video/vnd.uvvu.mp4", "uvvu": "video/vnd.uvvu.mp4", "viv": "video/vnd.vivo", "webm": "video/webm", "f4v": "video/x-f4v", "fli": "video/x-fli", "flv": "video/x-flv", "m4v": "video/x-m4v", "mkv": "video/x-matroska", "mk3d": "video/x-matroska", "mks": "video/x-matroska", "mng": "video/x-mng", "asf": "video/x-ms-asf", "asx": "video/x-ms-asf", "vob": "video/x-ms-vob", "wm": "video/x-ms-wm", "wmv": "video/x-ms-wmv", "wmx": "video/x-ms-wmx", "wvx": "video/x-ms-wvx", "avi": "video/x-msvideo", "movie": "video/x-sgi-movie", "smv": "video/x-smv", "ice": "x-conference/x-cooltalk" };
function getMimeType(extension) {
  const cleanExt = extension.startsWith(".") ? extension.slice(1) : extension;
  return mimeTypes[cleanExt] || "application/octet-stream";
}
__name(getMimeType, "getMimeType");
var mime_default = getMimeType;

// ../gilbert-file/lib/WebPath.js
var WebPath = class {
  /**
   * @description Resolves a sequence of paths into an absolute path
   * @param {...string} paths - Path segments to resolve
   * @return {string} The resolved absolute path
   * @static
   */
  static resolve(...paths) {
    const validPaths = paths.filter((p) => p != null && typeof p === "string");
    if (validPaths.length === 0) {
      return globalThis.process?.cwd?.() || "/";
    }
    let resolved = validPaths[0];
    if (!resolved.startsWith("/")) {
      resolved = `${globalThis.process?.cwd?.() || "/"}/${resolved}`;
    }
    for (let i = 1; i < validPaths.length; i++) {
      const segment = validPaths[i];
      if (segment.startsWith("/")) {
        resolved = segment;
      } else {
        resolved = `${resolved}/${segment}`;
      }
    }
    return this.normalize(resolved);
  }
  /**
   * @description Normalizes a path, resolving '..' and '.' segments
   * @param {string} path - The path to normalize
   * @return {string} The normalized path
   * @static
   */
  static normalize(path) {
    if (!path)
      return "/";
    const segments = path.split("/").filter(Boolean);
    const result = [];
    for (const segment of segments) {
      if (segment === "..") {
        result.pop();
      } else if (segment !== ".") {
        result.push(segment);
      }
    }
    return "/" + result.join("/");
  }
  /**
   * @description Returns the relative path from 'from' to 'to'
   * @param {string} from - The source path
   * @param {string} to - The destination path
   * @return {string} The relative path
   * @static
   */
  static relative(from, to) {
    if (!from || !to)
      return "";
    const fromParts = from.split("/").filter(Boolean);
    const toParts = to.split("/").filter(Boolean);
    let commonLength = 0;
    while (commonLength < fromParts.length && commonLength < toParts.length && fromParts[commonLength] === toParts[commonLength]) {
      commonLength++;
    }
    const upLevels = fromParts.length - commonLength;
    const downPath = toParts.slice(commonLength);
    return "../".repeat(upLevels) + downPath.join("/");
  }
  /**
   * @description Returns the extension of the path, from the last '.' to end of string
   * @param {string} filePath - The file path
   * @return {string} The file extension (including the '.')
   * @static
   */
  static extname(filePath) {
    if (!filePath)
      return "";
    const lastDot = filePath.lastIndexOf(".");
    const lastSlash = filePath.lastIndexOf("/");
    return lastDot > lastSlash ? filePath.slice(lastDot) : "";
  }
  /**
   * @description Returns the last portion of a path
   * @param {string} filePath - The file path
   * @param {string} [ext=""] - An optional file extension to remove
   * @return {string} The basename of the path
   * @static
   */
  static basename(filePath, ext = "") {
    if (!filePath)
      return "";
    const lastSlash = filePath.lastIndexOf("/");
    const name = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
    return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
  }
  /**
   * @description Returns the directory name of a path
   * @param {string} filePath - The file path
   * @return {string} The directory name
   * @static
   */
  static dirname(filePath) {
    if (!filePath)
      return ".";
    const lastSlash = filePath.lastIndexOf("/");
    return lastSlash > 0 ? filePath.slice(0, lastSlash) : lastSlash === 0 ? "/" : ".";
  }
};
__name(WebPath, "WebPath");

// ../gilbert-file/lib/index.js
var DEFAULT_CONTENT_TYPE = "application/octet-stream";
var GilbertFile = class {
  // Private fields
  #cwd;
  #base;
  #path;
  #history;
  #contentKind;
  #contents;
  #stat;
  #contentType;
  #size = null;
  #symlink = null;
  #isDirectory = false;
  /**
   * Creates an instance of GilbertFile.
   * @param {GilbertFileOptions} [options={}] - Configuration options for the file
   * @memberof GilbertFile
   */
  constructor(options = {}) {
    const normalizedOptions = {
      contents: options.contents || options.content || null,
      stat: {},
      type: options.type,
      contentType: options.contentType,
      ...options
    };
    this.cwd = normalizedOptions.cwd || globalThis.process?.cwd?.() || "/";
    if (normalizedOptions.path !== void 0 && normalizedOptions.path !== null) {
      this.path = normalizedOptions.path;
    } else {
      this.#path = null;
      this.#history = [null];
    }
    if (normalizedOptions.base !== void 0 && normalizedOptions.base !== null) {
      this.base = normalizedOptions.base;
    } else {
      this.#base = this.cwd;
    }
    this.contents = normalizedOptions.contents;
    this.stat = normalizedOptions.stat;
    this.#isDirectory = normalizedOptions.type === "directory";
    this.contentType = normalizedOptions.contentType || (this.extname ? mime_default(this.extname) : null) || DEFAULT_CONTENT_TYPE;
  }
  /**
   * @description Gets the current working directory.
   * @return {string} The current working directory path
   * @memberof GilbertFile
   */
  get cwd() {
    return this.#cwd;
  }
  /**
   * @description Sets the current working directory and updates dependent paths.
   * @param {string} val - The new current working directory to set
   * @throws {Error} When val is not a string
   * @memberof GilbertFile
   */
  set cwd(val) {
    if (typeof val !== "string") {
      throw new Error("CWD must be a string.");
    }
    this.#base = WebPath.resolve(val, this.#base);
    if (this.#path) {
      this.#path = WebPath.relative(val, this.#path);
    }
    this.#cwd = val;
  }
  /**
   * @description Gets the absolute path of the file.
   * @return {string|null} The absolute file path or null if not set
   * @memberof GilbertFile
   */
  get path() {
    return this.#path;
  }
  /**
   * @description Sets the absolute path of the file and updates history.
   * Automatically recalculates contentType based on the new file extension.
   * @param {string} val - The absolute or relative path to set
   * @throws {Error} When val is not a string
   * @memberof GilbertFile
   */
  set path(val) {
    if (typeof val !== "string") {
      throw new Error("Path must be a string.");
    }
    this.#path = WebPath.resolve(this.#cwd, val);
    this.#history = [this.#path];
    const mimeType = mime_default(this.extname);
    if (mimeType) {
      this.#contentType = mimeType;
    }
  }
  /**
   * @description Gets the base directory for relative path calculations.
   * @return {string} The base directory path
   * @memberof GilbertFile
   */
  get base() {
    return this.#base;
  }
  /**
   * @description Sets the base directory for relative path calculations.
   * @param {string} val - The base directory to set
   * @throws {Error} When val is not a string
   * @memberof GilbertFile
   */
  set base(val) {
    if (typeof val !== "string") {
      throw new Error("Base must be a string.");
    }
    this.#base = WebPath.resolve(this.#cwd, val);
  }
  /**
   * @description Gets the symlink for the file
   * @return {string|null} The symlink path or null if not a symlink
   * @memberof GilbertFile
   */
  get symlink() {
    return this.#symlink;
  }
  /**
   * @description Gets the history of paths for the file.
   * @return {Array<string|null>} Array containing the path history for Vinyl compatibility
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get history() {
    return this.#history;
  }
  /**
   * @description Gets the contents of the file.
   * @return {FileContents} The file contents (Uint8Array, ReadableStream, or null)
   * @memberof GilbertFile
   */
  get contents() {
    return this.#contents;
  }
  /**
   * @description Sets the contents of the file and updates content kind.
   * @param {FileContents} newContents - The new contents to set
   * @throws {Error} When newContents is not a valid FileContents type
   * @memberof GilbertFile
   */
  set contents(newContents) {
    const isValidStream = typeof newContents === "object" && newContents !== null && "getReader" in newContents;
    if (newContents !== null && !(newContents instanceof Uint8Array) && !isValidStream) {
      throw new Error("Contents must be a Uint8Array, a ReadableStream, or null.");
    }
    this.#contents = newContents;
    if (newContents instanceof Uint8Array) {
      this.#contentKind = "buffer";
      this.#size = newContents.length;
    } else if (isValidStream) {
      this.#contentKind = "stream";
      this.#size = null;
    } else if (newContents === null) {
      this.#contentKind = "null";
      this.#size = 0;
    } else {
      this.#contentKind = "unknown";
      this.#size = null;
    }
  }
  /**
   * @description Gets the file extension from the path.
   * @return {string} The file extension including the dot (e.g., '.js', '.html') or empty string
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get extname() {
    return WebPath.extname(this.path);
  }
  /**
   * @description Gets the MIME type of the file.
   * @return {string} The MIME type of the file content
   * @memberof GilbertFile
   */
  get contentType() {
    return this.#contentType;
  }
  /**
   * @description Sets the MIME type of the file
   * @param {string} val - The MIME type to set.
   * @throws {Error} When val is not a string
   * @memberof GilbertFile
   */
  set contentType(val) {
    if (typeof val !== "string") {
      throw new Error("Content type must be a string.");
    }
    this.#contentType = val;
  }
  /**
   * @description Gets the calculated size of the file contents in bytes.
   * Size is automatically calculated and cached when contents are set.
   * @return {number|null} Size in bytes for buffers, 0 for null contents, null for streams or unknown content
   * @readonly
   * @memberof GilbertFile
   */
  get size() {
    return this.#size;
  }
  /**
   * @description Gets the relative path of the file from the base directory.
   * @return {string} The relative path from base to this file
   * @readonly
   * @memberof GilbertFile
   */
  get relative() {
    return WebPath.relative(this.#base, this.path);
  }
  /**
   * @description Gets the stem (filename without suffix) of file.path.
   * @return {string} The filename without its extension
   * @readonly
   * @memberof GilbertFile
   */
  get stem() {
    return WebPath.basename(this.path, this.extname);
  }
  /**
   * @description Gets the directory name of file.path.
   * @return {string} The directory portion of the file path
   * @readonly
   * @memberof GilbertFile
   */
  get dirname() {
    return WebPath.dirname(this.path);
  }
  /**
   * @description Gets the base filename including extension.
   * @return {string} The filename with extension (e.g., 'index.html')
   * @readonly
   * @memberof GilbertFile
   */
  get basename() {
    return WebPath.basename(this.path);
  }
  /**
   * @description Gets the fs.Stats-like object for the file.
   * This is typically null unless explicitly set or provided in the constructor.
   * @return {FileStats|null} The file stats object or null
   * @memberof GilbertFile
   */
  get stat() {
    return this.#stat;
  }
  /**
   * @description Sets the fs.Stats-like object for the file.
   * Validates that stat.size (if present) matches the calculated content size.
   * @param {FileStats|null} newStat - The file stats object to set
   * @throws {Error} When stat.size conflicts with calculated content size
   * @memberof GilbertFile
   */
  set stat(newStat) {
    if (newStat === null) {
      this.#stat = null;
      return;
    }
    if (newStat && typeof newStat.size === "number" && this.#size !== null) {
      if (newStat.size !== this.#size) {
        throw new Error(
          `Stat size (${newStat.size}) does not match calculated content size (${this.#size}). Use a stat object without size property to avoid conflicts.`
        );
      }
    }
    this.#stat = newStat;
  }
  /**
   * @description Creates a stat object with the current calculated size and optional additional properties.
   * This is a convenient way to set stat while ensuring size consistency.
   * @param {Partial<FileStats>} [additionalProps={}] - Additional stat properties (mtime, ctime, etc.)
   * @return {FileStats} A stat object with calculated size and additional properties
   * @memberof GilbertFile
   */
  createStat(additionalProps = {}) {
    return {
      size: this.#size,
      ...additionalProps
    };
  }
  /**
   * @description Checks if the file contents are stored as a Uint8Array buffer.
   * @return {boolean} True if contents are a Uint8Array, false otherwise
   * @memberof GilbertFile
   */
  isBuffer() {
    return this.#contentKind === "buffer";
  }
  /**
   * @description Checks if the file contents are stored as a ReadableStream.
   * @return {boolean} True if contents are a ReadableStream, false otherwise
   * @memberof GilbertFile
   */
  isStream() {
    return this.#contentKind === "stream";
  }
  /**
   * @description Checks if the file has no contents (null).
   * @return {boolean} True if contents are null, false otherwise
   * @memberof GilbertFile
   */
  isNull() {
    return this.#contentKind === "null";
  }
  /**
   * @description Checks if the GilbertFile object represents a directory.
   * @return {boolean} True if this represents a directory, false otherwise
   * @vinylCompatibility
   * @memberof GilbertFile
   */
  isDirectory() {
    if (this.#isDirectory) {
      return true;
    }
    if (this.contents === null) {
      if (this.stat && typeof this.stat.isDirectory === "function") {
        return this.stat.isDirectory();
      }
      if (this.stat && typeof this.stat.isFile === "function" && this.stat.isFile()) {
        return false;
      }
      return true;
    }
    return false;
  }
  /**
   * @description Checks if the GilbertFile object represents a regular file.
   * @return {boolean} True if this is a regular file (not directory or symlink), false otherwise
   * @vinylCompatibility
   * @memberof GilbertFile
   */
  isFile() {
    return !this.isDirectory() && !this.isSymbolic();
  }
  /**
   * @description Checks if the GilbertFile object represents a symbolic link.
   * Mimics Vinyl's behavior based on README:
   * - file.isNull() is true
   * - file.stat is an object
   * - file.stat.isSymbolicLink() returns true
   * @vinylCompatibility
   * @return {boolean}
   * @memberof GilbertFile
   */
  isSymbolic() {
    return false;
  }
  /**
   * @description Vinyl compatibility property indicating this is a vinyl-like object.
   * @return {boolean} Always returns true
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get _isVinyl() {
    return true;
  }
  /**
   * @description Vinyl compatibility property for symlink.
   * @return {string|null} The symlink path
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get _symlink() {
    return this.#symlink;
  }
  /**
   * @description Vinyl compatibility property for current working directory.
   * @return {string} The current working directory
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get _cwd() {
    return this.#cwd;
  }
  /**
   * @description Vinyl compatibility property for file contents.
   * @return {FileContents} The file contents
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get _contents() {
    return this.#contents;
  }
  /**
   * @description Converts the file contents to a string.
   * If contents are a Uint8Array, decodes using UTF-8.
   * If contents are a ReadableStream, reads the entire stream and decodes as UTF-8.
   * @returns {Promise<string>} A promise that resolves to the file contents as a string
   * @throws {Error} When contents are null or cannot be converted to string
   * @memberof GilbertFile
   */
  async toString() {
    if (this.isNull()) {
      throw new Error("Cannot convert null contents to string");
    }
    if (this.isBuffer()) {
      return new TextDecoder().decode(
        /** @type {Uint8Array} */
        this.contents
      );
    }
    if (this.isStream()) {
      const [preservedStream, readingStream] = (
        /** @type {ReadableStream} */
        this.contents.tee()
      );
      this.#contents = preservedStream;
      const reader = readingStream.getReader();
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done)
            break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      return new TextDecoder().decode(combined);
    }
    throw new Error(`Cannot convert contents of type '${this.#contentKind}' to string`);
  }
  /**
   * @description Converts the file contents to a Uint8Array buffer.
   * If contents are already a Uint8Array, returns them directly.
   * If contents are a ReadableStream, reads the entire stream into a buffer.
   * @returns {Promise<Uint8Array>} A promise that resolves to the file contents as a Uint8Array
   * @throws {Error} When contents are null or cannot be converted to buffer
   * @memberof GilbertFile
   */
  async toBuffer() {
    if (this.isNull()) {
      throw new Error("Cannot convert null contents to buffer");
    }
    if (this.isBuffer()) {
      return (
        /** @type {Uint8Array} */
        this.contents
      );
    }
    if (this.isStream()) {
      const [preservedStream, readingStream] = (
        /** @type {ReadableStream} */
        this.contents.tee()
      );
      this.#contents = preservedStream;
      const reader = readingStream.getReader();
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done)
            break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      return combined;
    }
    throw new Error(`Cannot convert contents of type '${this.#contentKind}' to buffer`);
  }
  /**
   * @description Creates a copy of this GilbertFile with optional property overrides.
   * This is useful for transforms that need to modify certain properties while preserving others.
   * @param {GilbertFileOptions} [overrides={}] - Properties to override in the cloned file
   * @returns {GilbertFile} A new GilbertFile instance with the same properties, plus any overrides
   * @example
   * // Clone with new contents but preserve all metadata
   * const minified = originalFile.clone({ contents: minifiedStream });
   *
   * // Clone with new path and contents
   * const compiled = sourceFile.clone({
   *   path: sourceFile.path.replace('.ts', '.js'),
   *   contents: compiledContents
   * });
   * @memberof GilbertFile
   */
  clone(overrides = {}) {
    let contents = this.contents;
    if (this.contents instanceof ReadableStream && !overrides.contents) {
      const [stream1, stream2] = this.contents.tee();
      this.#contents = stream1;
      contents = stream2;
    }
    return new GilbertFile({
      // Copy all current properties
      path: this.path,
      base: this.base,
      cwd: this.cwd,
      contents,
      stat: this.stat,
      contentType: this.contentType,
      // Apply any overrides
      ...overrides
    });
  }
};
__name(GilbertFile, "GilbertFile");

// tests/integration-worker.js
var integration_worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/test") {
      return handleTest(env);
    }
    return new Response("Gilbert R2 Integration Test Worker\n\nEndpoints:\n- GET /test - Run integration tests", {
      headers: { "content-type": "text/plain" }
    });
  }
};
async function handleTest(env) {
  const results = [];
  let allPassed = true;
  try {
    results.push("Test 1: Creating GilbertR2 adapter with binding...");
    const r2 = new GilbertR2({
      bucket: "test-bucket",
      binding: env.TEST_BUCKET
    });
    results.push("\u2713 Test 1 passed: Adapter created successfully\n");
    results.push("Test 2: Writing a simple text file to R2...");
    const testContent = "Hello from Gilbert R2!";
    const testContentBytes = new TextEncoder().encode(testContent);
    const textFile = new GilbertFile({
      path: "/test/hello.txt",
      base: "/test",
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(testContentBytes);
          controller.close();
        }
      }),
      contentType: "text/plain",
      stat: {
        size: testContentBytes.length
      }
    });
    await new ReadableStream({
      pull(controller) {
        controller.enqueue(textFile);
        controller.close();
      }
    }).pipeTo(r2.write("/"));
    results.push("\u2713 Test 2 passed: Text file written successfully\n");
    results.push("Test 3: Reading file back from R2...");
    const object = await env.TEST_BUCKET.get("hello.txt");
    if (!object) {
      throw new Error("File not found in R2");
    }
    const content = await object.text();
    if (content !== "Hello from Gilbert R2!") {
      throw new Error(`Content mismatch: expected "Hello from Gilbert R2!", got "${content}"`);
    }
    results.push("\u2713 Test 3 passed: File content verified\n");
    results.push("Test 4: Writing HTML file with cache control...");
    const htmlContent = "<!DOCTYPE html><html><body>Test</body></html>";
    const htmlBytes = new TextEncoder().encode(htmlContent);
    const htmlFile = new GilbertFile({
      path: "/test/index.html",
      base: "/test",
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(htmlBytes);
          controller.close();
        }
      }),
      contentType: "text/html",
      stat: {
        size: htmlBytes.length
      }
    });
    await new ReadableStream({
      start(controller) {
        controller.enqueue(htmlFile);
        controller.close();
      }
    }).pipeTo(
      r2.write("/", {
        cacheControl: {
          html: 300
          // 5 minutes
        }
      })
    );
    results.push("\u2713 Test 4 passed: HTML file written with cache control\n");
    results.push("Test 5: Verifying HTTP metadata...");
    const htmlObject = await env.TEST_BUCKET.get("index.html");
    if (!htmlObject) {
      throw new Error("HTML file not found in R2");
    }
    results.push(`  Content-Type: ${htmlObject.httpMetadata?.contentType}`);
    results.push(`  Cache-Control: ${htmlObject.httpMetadata?.cacheControl}`);
    if (htmlObject.httpMetadata?.cacheControl !== "public, max-age=300") {
      throw new Error(`Cache control mismatch: expected "public, max-age=300", got "${htmlObject.httpMetadata?.cacheControl}"`);
    }
    results.push("\u2713 Test 5 passed: HTTP metadata verified\n");
    results.push("Test 6: Writing multiple files in stream...");
    const file1Content = new TextEncoder().encode("File 1");
    const file2Content = new TextEncoder().encode("File 2");
    const file3Content = new TextEncoder().encode("File 3");
    const files = [
      new GilbertFile({
        path: "/test/file1.txt",
        base: "/test",
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(file1Content);
            controller.close();
          }
        }),
        stat: { size: file1Content.length }
      }),
      new GilbertFile({
        path: "/test/file2.txt",
        base: "/test",
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(file2Content);
            controller.close();
          }
        }),
        stat: { size: file2Content.length }
      }),
      new GilbertFile({
        path: "/test/file3.txt",
        base: "/test",
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(file3Content);
            controller.close();
          }
        }),
        stat: { size: file3Content.length }
      })
    ];
    let index = 0;
    await new ReadableStream({
      pull(controller) {
        if (index < files.length) {
          controller.enqueue(files[index++]);
        } else {
          controller.close();
        }
      }
    }).pipeTo(r2.write("/"));
    for (let i = 1; i <= 3; i++) {
      const file = await env.TEST_BUCKET.get(`file${i}.txt`);
      if (!file) {
        throw new Error(`file${i}.txt not found in R2`);
      }
      const text = await file.text();
      if (text !== `File ${i}`) {
        throw new Error(`file${i}.txt content mismatch`);
      }
    }
    results.push("\u2713 Test 6 passed: Multiple files written and verified\n");
    results.push("Test 7: Writing file with custom metadata...");
    const metadataContent = new TextEncoder().encode("Metadata test");
    const metadataFile = new GilbertFile({
      path: "/test/metadata.txt",
      base: "/test",
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(metadataContent);
          controller.close();
        }
      }),
      stat: { size: metadataContent.length }
    });
    await new ReadableStream({
      start(controller) {
        controller.enqueue(metadataFile);
        controller.close();
      }
    }).pipeTo(
      r2.write("/", {
        customMetadata: {
          version: "1.0.0",
          environment: "test"
        }
      })
    );
    const metadataObject = await env.TEST_BUCKET.get("metadata.txt");
    results.push(`  Custom metadata: ${JSON.stringify(metadataObject.customMetadata)}`);
    if (metadataObject.customMetadata?.version !== "1.0.0") {
      throw new Error("Custom metadata not set correctly");
    }
    results.push("\u2713 Test 7 passed: Custom metadata verified\n");
    results.push("\n=========================");
    results.push("\u2705 ALL TESTS PASSED!");
    results.push("=========================");
  } catch (error) {
    allPassed = false;
    results.push(`
\u274C TEST FAILED: ${error.message}`);
    results.push(`Stack: ${error.stack}`);
  }
  return new Response(results.join("\n"), {
    status: allPassed ? 200 : 500,
    headers: { "content-type": "text/plain" }
  });
}
__name(handleTest, "handleTest");

// ../../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-1rvnZT/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = integration_worker_default;

// ../../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-1rvnZT/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=integration-worker.js.map
