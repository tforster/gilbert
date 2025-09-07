<a name="GilbertFile"></a>

## GilbertFile
**Kind**: global class  

* [GilbertFile](#GilbertFile)
    * [new GilbertFile()](#new_GilbertFile_new)
    * [.module.exports](#GilbertFile.module.exports)
        * [new module.exports([options])](#new_GilbertFile.module.exports_new)
    * [.cwd](#GilbertFile.cwd) ⇒ <code>string</code>
    * [.cwd](#GilbertFile.cwd)
    * [.path](#GilbertFile.path) ⇒ <code>string</code> \| <code>null</code>
    * [.path](#GilbertFile.path)
    * [.base](#GilbertFile.base) ⇒ <code>string</code>
    * [.base](#GilbertFile.base)
    * [.symlink](#GilbertFile.symlink) ⇒ <code>string</code> \| <code>null</code>
    * [.history](#GilbertFile.history) ⇒ <code>Array.&lt;(string\|null)&gt;</code>
    * [.contents](#GilbertFile.contents) ⇒ [<code>FileContents</code>](#FileContents)
    * [.contents](#GilbertFile.contents)
    * [.extname](#GilbertFile.extname) ⇒ <code>string</code>
    * [.contentType](#GilbertFile.contentType) ⇒ <code>string</code>
    * [.contentType](#GilbertFile.contentType)
    * [.size](#GilbertFile.size) ⇒ <code>number</code> \| <code>null</code>
    * [.relative](#GilbertFile.relative) ⇒ <code>string</code>
    * [.stem](#GilbertFile.stem) ⇒ <code>string</code>
    * [.dirname](#GilbertFile.dirname) ⇒ <code>string</code>
    * [.basename](#GilbertFile.basename) ⇒ <code>string</code>
    * [.stat](#GilbertFile.stat) ⇒ [<code>FileStats</code>](#FileStats) \| <code>null</code>
    * [.stat](#GilbertFile.stat)
    * [._isVinyl](#GilbertFile._isVinyl) ⇒ <code>boolean</code>
    * [._symlink](#GilbertFile._symlink) ⇒ <code>string</code> \| <code>null</code>
    * [._cwd](#GilbertFile._cwd) ⇒ <code>string</code>
    * [._contents](#GilbertFile._contents) ⇒ [<code>FileContents</code>](#FileContents)
    * [.createStat([additionalProps])](#GilbertFile.createStat) ⇒ [<code>FileStats</code>](#FileStats)
    * [.isBuffer()](#GilbertFile.isBuffer) ⇒ <code>boolean</code>
    * [.isStream()](#GilbertFile.isStream) ⇒ <code>boolean</code>
    * [.isNull()](#GilbertFile.isNull) ⇒ <code>boolean</code>
    * [.isDirectory()](#GilbertFile.isDirectory) ⇒ <code>boolean</code>
    * [.isFile()](#GilbertFile.isFile) ⇒ <code>boolean</code>
    * [.isSymbolic()](#GilbertFile.isSymbolic) ⇒ <code>boolean</code>

<a name="new_GilbertFile_new"></a>

### new GilbertFile()
Implements a virtual file object for Gilbert to use in stream processing

<a name="GilbertFile.module.exports"></a>

### GilbertFile.module.exports
**Kind**: static class of [<code>GilbertFile</code>](#GilbertFile)  
<a name="new_GilbertFile.module.exports_new"></a>

#### new module.exports([options])
Creates an instance of GilbertFile.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | [<code>GilbertFileOptions</code>](#GilbertFileOptions) | <code>{}</code> | Configuration options for the file |

<a name="GilbertFile.cwd"></a>

### GilbertFile.cwd ⇒ <code>string</code>
Gets the current working directory.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> - The current working directory path  
<a name="GilbertFile.cwd"></a>

### GilbertFile.cwd
Sets the current working directory and updates dependent paths.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Throws**:

- <code>Error</code> When val is not a string


| Param | Type | Description |
| --- | --- | --- |
| val | <code>string</code> | The new current working directory to set |

<a name="GilbertFile.path"></a>

### GilbertFile.path ⇒ <code>string</code> \| <code>null</code>
Gets the absolute path of the file.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> \| <code>null</code> - The absolute file path or null if not set  
<a name="GilbertFile.path"></a>

### GilbertFile.path
Sets the absolute path of the file and updates history.
Automatically recalculates contentType based on the new file extension.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Throws**:

- <code>Error</code> When val is not a string


| Param | Type | Description |
| --- | --- | --- |
| val | <code>string</code> | The absolute or relative path to set |

<a name="GilbertFile.base"></a>

### GilbertFile.base ⇒ <code>string</code>
Gets the base directory for relative path calculations.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> - The base directory path  
<a name="GilbertFile.base"></a>

### GilbertFile.base
Sets the base directory for relative path calculations.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Throws**:

- <code>Error</code> When val is not a string


| Param | Type | Description |
| --- | --- | --- |
| val | <code>string</code> | The base directory to set |

<a name="GilbertFile.symlink"></a>

### GilbertFile.symlink ⇒ <code>string</code> \| <code>null</code>
Gets the symlink for the file

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> \| <code>null</code> - The symlink path or null if not a symlink  
<a name="GilbertFile.history"></a>

### GilbertFile.history ⇒ <code>Array.&lt;(string\|null)&gt;</code>
Gets the history of paths for the file.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>Array.&lt;(string\|null)&gt;</code> - Array containing the path history for Vinyl compatibility  
**Read only**: true  
**Vinylcompatibility**:   
<a name="GilbertFile.contents"></a>

### GilbertFile.contents ⇒ [<code>FileContents</code>](#FileContents)
Gets the contents of the file.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: [<code>FileContents</code>](#FileContents) - The file contents (Uint8Array, ReadableStream, or null)  
<a name="GilbertFile.contents"></a>

### GilbertFile.contents
Sets the contents of the file and updates content kind.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Throws**:

- <code>Error</code> When newContents is not a valid FileContents type


| Param | Type | Description |
| --- | --- | --- |
| newContents | [<code>FileContents</code>](#FileContents) | The new contents to set |

<a name="GilbertFile.extname"></a>

### GilbertFile.extname ⇒ <code>string</code>
Gets the file extension from the path.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> - The file extension including the dot (e.g., '.js', '.html') or empty string  
**Read only**: true  
**Vinylcompatibility**:   
<a name="GilbertFile.contentType"></a>

### GilbertFile.contentType ⇒ <code>string</code>
Gets the MIME type of the file.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> - The MIME type of the file content  
<a name="GilbertFile.contentType"></a>

### GilbertFile.contentType
Sets the MIME type of the file

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Throws**:

- <code>Error</code> When val is not a string


| Param | Type | Description |
| --- | --- | --- |
| val | <code>string</code> | The MIME type to set. |

<a name="GilbertFile.size"></a>

### GilbertFile.size ⇒ <code>number</code> \| <code>null</code>
Gets the calculated size of the file contents in bytes.
Size is automatically calculated and cached when contents are set.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>number</code> \| <code>null</code> - Size in bytes for buffers, 0 for null contents, null for streams or unknown content  
**Read only**: true  
<a name="GilbertFile.relative"></a>

### GilbertFile.relative ⇒ <code>string</code>
Gets the relative path of the file from the base directory.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> - The relative path from base to this file  
**Read only**: true  
<a name="GilbertFile.stem"></a>

### GilbertFile.stem ⇒ <code>string</code>
Gets the stem (filename without suffix) of file.path.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> - The filename without its extension  
**Read only**: true  
<a name="GilbertFile.dirname"></a>

### GilbertFile.dirname ⇒ <code>string</code>
Gets the directory name of file.path.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> - The directory portion of the file path  
**Read only**: true  
<a name="GilbertFile.basename"></a>

### GilbertFile.basename ⇒ <code>string</code>
Gets the base filename including extension.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> - The filename with extension (e.g., 'index.html')  
**Read only**: true  
<a name="GilbertFile.stat"></a>

### GilbertFile.stat ⇒ [<code>FileStats</code>](#FileStats) \| <code>null</code>
Gets the fs.Stats-like object for the file.
This is typically null unless explicitly set or provided in the constructor.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: [<code>FileStats</code>](#FileStats) \| <code>null</code> - The file stats object or null  
<a name="GilbertFile.stat"></a>

### GilbertFile.stat
Sets the fs.Stats-like object for the file.
Validates that stat.size (if present) matches the calculated content size.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Throws**:

- <code>Error</code> When stat.size conflicts with calculated content size


| Param | Type | Description |
| --- | --- | --- |
| newStat | [<code>FileStats</code>](#FileStats) \| <code>null</code> | The file stats object to set |

<a name="GilbertFile._isVinyl"></a>

### GilbertFile.\_isVinyl ⇒ <code>boolean</code>
Vinyl compatibility property indicating this is a vinyl-like object.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>boolean</code> - Always returns true  
**Read only**: true  
**Vinylcompatibility**:   
<a name="GilbertFile._symlink"></a>

### GilbertFile.\_symlink ⇒ <code>string</code> \| <code>null</code>
Vinyl compatibility property for symlink.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> \| <code>null</code> - The symlink path  
**Read only**: true  
**Vinylcompatibility**:   
<a name="GilbertFile._cwd"></a>

### GilbertFile.\_cwd ⇒ <code>string</code>
Vinyl compatibility property for current working directory.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>string</code> - The current working directory  
**Read only**: true  
**Vinylcompatibility**:   
<a name="GilbertFile._contents"></a>

### GilbertFile.\_contents ⇒ [<code>FileContents</code>](#FileContents)
Vinyl compatibility property for file contents.

**Kind**: static property of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: [<code>FileContents</code>](#FileContents) - The file contents  
**Read only**: true  
**Vinylcompatibility**:   
<a name="GilbertFile.createStat"></a>

### GilbertFile.createStat([additionalProps]) ⇒ [<code>FileStats</code>](#FileStats)
Creates a stat object with the current calculated size and optional additional properties.
This is a convenient way to set stat while ensuring size consistency.

**Kind**: static method of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: [<code>FileStats</code>](#FileStats) - A stat object with calculated size and additional properties  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [additionalProps] | [<code>Partial.&lt;FileStats&gt;</code>](#FileStats) | <code>{}</code> | Additional stat properties (mtime, ctime, etc.) |

<a name="GilbertFile.isBuffer"></a>

### GilbertFile.isBuffer() ⇒ <code>boolean</code>
Checks if the file contents are stored as a Uint8Array buffer.

**Kind**: static method of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>boolean</code> - True if contents are a Uint8Array, false otherwise  
<a name="GilbertFile.isStream"></a>

### GilbertFile.isStream() ⇒ <code>boolean</code>
Checks if the file contents are stored as a ReadableStream.

**Kind**: static method of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>boolean</code> - True if contents are a ReadableStream, false otherwise  
<a name="GilbertFile.isNull"></a>

### GilbertFile.isNull() ⇒ <code>boolean</code>
Checks if the file has no contents (null).

**Kind**: static method of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>boolean</code> - True if contents are null, false otherwise  
<a name="GilbertFile.isDirectory"></a>

### GilbertFile.isDirectory() ⇒ <code>boolean</code>
Checks if the GilbertFile object represents a directory.

**Kind**: static method of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>boolean</code> - True if this represents a directory, false otherwise  
**Vinylcompatibility**:   
<a name="GilbertFile.isFile"></a>

### GilbertFile.isFile() ⇒ <code>boolean</code>
Checks if the GilbertFile object represents a regular file.

**Kind**: static method of [<code>GilbertFile</code>](#GilbertFile)  
**Returns**: <code>boolean</code> - True if this is a regular file (not directory or symlink), false otherwise  
**Vinylcompatibility**:   
<a name="GilbertFile.isSymbolic"></a>

### GilbertFile.isSymbolic() ⇒ <code>boolean</code>
Checks if the GilbertFile object represents a symbolic link.
Mimics Vinyl's behavior based on README:
- file.isNull() is true
- file.stat is an object
- file.stat.isSymbolicLink() returns true

**Kind**: static method of [<code>GilbertFile</code>](#GilbertFile)  
**Vinylcompatibility**:   
<a name="WebPath"></a>

## WebPath
**Kind**: global class  
<a name="new_WebPath_new"></a>

### new WebPath()
Web API-compatible path manipulation utilities for runtime-agnostic environments

<a name="resolve"></a>

## resolve(...paths) ⇒ <code>string</code>
Resolves a sequence of paths into an absolute path

**Kind**: global function  
**Returns**: <code>string</code> - The resolved absolute path  

| Param | Type | Description |
| --- | --- | --- |
| ...paths | <code>string</code> | Path segments to resolve |

<a name="normalize"></a>

## normalize(path) ⇒ <code>string</code>
Normalizes a path, resolving '..' and '.' segments

**Kind**: global function  
**Returns**: <code>string</code> - The normalized path  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | The path to normalize |

<a name="relative"></a>

## relative(from, to) ⇒ <code>string</code>
Returns the relative path from 'from' to 'to'

**Kind**: global function  
**Returns**: <code>string</code> - The relative path  

| Param | Type | Description |
| --- | --- | --- |
| from | <code>string</code> | The source path |
| to | <code>string</code> | The destination path |

<a name="extname"></a>

## extname(filePath) ⇒ <code>string</code>
Returns the extension of the path, from the last '.' to end of string

**Kind**: global function  
**Returns**: <code>string</code> - The file extension (including the '.')  

| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> | The file path |

<a name="basename"></a>

## basename(filePath, [ext]) ⇒ <code>string</code>
Returns the last portion of a path

**Kind**: global function  
**Returns**: <code>string</code> - The basename of the path  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| filePath | <code>string</code> |  | The file path |
| [ext] | <code>string</code> | <code>&quot;\&quot;\&quot;&quot;</code> | An optional file extension to remove |

<a name="dirname"></a>

## dirname(filePath) ⇒ <code>string</code>
Returns the directory name of a path

**Kind**: global function  
**Returns**: <code>string</code> - The directory name  

| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> | The file path |

<a name="FileStats"></a>

## FileStats : <code>Object</code>
File system stats object similar to fs.Stats

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [size] | <code>number</code> | Size of the file in bytes (must match calculated content size if provided) |
| [mtime] | <code>Date</code> | Last modification time |
| [ctime] | <code>Date</code> | Creation time |
| [atime] | <code>Date</code> | Last access time |
| [isFile] | <code>function</code> | Function that returns true if this is a file |
| [isDirectory] | <code>function</code> | Function that returns true if this is a directory |
| [isSymbolicLink] | <code>function</code> | Function that returns true if this is a symbolic link |

<a name="FileContents"></a>

## FileContents : <code>Uint8Array</code> \| <code>ReadableStream</code> \| <code>null</code>
Valid content types for a Gilbert file - supports Web API streams only

**Kind**: global typedef  
<a name="GilbertFileOptions"></a>

## GilbertFileOptions : <code>Object</code>
Configuration options for creating a GilbertFile

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [base] | <code>string</code> | The base directory for relative path calculations |
| [cwd] | <code>string</code> | The current working directory |
| [path] | <code>string</code> | The file path |
| [contents] | [<code>FileContents</code>](#FileContents) | The file contents |
| [content] | [<code>FileContents</code>](#FileContents) | Alias for contents |
| [stat] | [<code>FileStats</code>](#FileStats) | File system stats object |
| [type] | <code>&#x27;directory&#x27;</code> | File type, set to 'directory' for directories |
| [contentType] | <code>string</code> | MIME type of the file content |

