# Classes

<dl>
<dt><a href="#WebPath">WebPath</a></dt>
<dd></dd>
</dl>

# Functions

<dl>
<dt><a href="#resolve">resolve(...paths)</a> ⇒ <code>string</code></dt>
<dd><p>Resolves a sequence of paths into an absolute path</p>
</dd>
<dt><a href="#normalize">normalize(path)</a> ⇒ <code>string</code></dt>
<dd><p>Normalizes a path, resolving &#39;..&#39; and &#39;.&#39; segments</p>
</dd>
<dt><a href="#relative">relative(from, to)</a> ⇒ <code>string</code></dt>
<dd><p>Returns the relative path from &#39;from&#39; to &#39;to&#39;</p>
</dd>
<dt><a href="#extname">extname(filePath)</a> ⇒ <code>string</code></dt>
<dd><p>Returns the extension of the path, from the last &#39;.&#39; to end of string</p>
</dd>
<dt><a href="#basename">basename(filePath, [ext])</a> ⇒ <code>string</code></dt>
<dd><p>Returns the last portion of a path</p>
</dd>
<dt><a href="#dirname">dirname(filePath)</a> ⇒ <code>string</code></dt>
<dd><p>Returns the directory name of a path</p>
</dd>
</dl>

<a name="WebPath"></a>

# WebPath
**Kind**: global class  
<a name="new_WebPath_new"></a>

## new WebPath()
Web API-compatible path manipulation utilities for runtime-agnostic environments

<a name="resolve"></a>

# resolve(...paths) ⇒ <code>string</code>
Resolves a sequence of paths into an absolute path

**Kind**: global function  
**Returns**: <code>string</code> - The resolved absolute path  

| Param | Type | Description |
| --- | --- | --- |
| ...paths | <code>string</code> | Path segments to resolve |

<a name="normalize"></a>

# normalize(path) ⇒ <code>string</code>
Normalizes a path, resolving '..' and '.' segments

**Kind**: global function  
**Returns**: <code>string</code> - The normalized path  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | The path to normalize |

<a name="relative"></a>

# relative(from, to) ⇒ <code>string</code>
Returns the relative path from 'from' to 'to'

**Kind**: global function  
**Returns**: <code>string</code> - The relative path  

| Param | Type | Description |
| --- | --- | --- |
| from | <code>string</code> | The source path |
| to | <code>string</code> | The destination path |

<a name="extname"></a>

# extname(filePath) ⇒ <code>string</code>
Returns the extension of the path, from the last '.' to end of string

**Kind**: global function  
**Returns**: <code>string</code> - The file extension (including the '.')  

| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> | The file path |

<a name="basename"></a>

# basename(filePath, [ext]) ⇒ <code>string</code>
Returns the last portion of a path

**Kind**: global function  
**Returns**: <code>string</code> - The basename of the path  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| filePath | <code>string</code> |  | The file path |
| [ext] | <code>string</code> | <code>&quot;\&quot;\&quot;&quot;</code> | An optional file extension to remove |

<a name="dirname"></a>

# dirname(filePath) ⇒ <code>string</code>
Returns the directory name of a path

**Kind**: global function  
**Returns**: <code>string</code> - The directory name  

| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> | The file path |

