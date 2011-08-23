/* 
 * jsStruct.js - Utility to assist in parsing c-style structs from an ArrayBuffer
 */

/*
 * Copyright (c) 2011 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

"use strict";

// TODO: Ugh, this is messy. Do it differentely soon, please!
var nextStructId = 0;

/**
* 
*/
var jsStruct = Object.create(Object, {
    // Parseable Primitves
    int8:    { value: { readCode: "v.getInt8(o, true);", byteLength: 1, defaultValue: 0 } },
    uint8:   { value: { readCode: "v.getUint8(o, true);", byteLength: 1, defaultValue: 0 } },
    int16:   { value: { readCode: "v.getInt16(o, true);", byteLength: 2, defaultValue: 0 } },
    uint16:  { value: { readCode: "v.getUint16(o, true);", byteLength: 2, defaultValue: 0 } },
    int32:   { value: { readCode: "v.getInt32(o, true);", byteLength: 4, defaultValue: 0 } },
    uint32:  { value: { readCode: "v.getUint32(o, true);", byteLength: 4, defaultValue: 0 } },
    float32: { value: { readCode: "v.getFloat32(o, true);", byteLength: 4, defaultValue: 0 } },
    float64: { value: { readCode: "v.getFloat64(o, true);", byteLength: 8, defaultValue: 0 } },
    
    /**
    * Defines a fixed-length ASCII string. 
    * Will always read the number of characters specified, but the returned string will truncate at the first null char.
    * @param length Number of characters to read
    */
    string: {
        value: function(length) {
            var code = "(function() {\n";
            code += "   var str = \"\";\n";
            code += "   for(var j = 0; j < " + length + "; ++j) {\n";
            code += "       var char = v.getUint8(o+j, true);\n";
            code += "       if(char === 0) { break; }\n";
            code += "       str += String.fromCharCode(char);\n";
            code += "   }\n";
            code += "   return str;\n"
            code += "})();\n";
            return { 
                readCode: code, 
                byteLength: length, 
                defaultValue: "" 
            };
        }
    },
    
    /**
    * Defines a fixed-length array of structs or primitives
    * @param type struct or primitive type to read
    * @param length Number of elements to read. Total bytes read will be type.byteLength * length
    */
    array: {
        value: function(type, length) {
            var code = "(function() {\n";
            code += "   var aa = new Array(" + length + "), av;\n";
            code += "   for(var j = 0; j < " + length + "; ++j) {\n";
            code += "   av = " + type.readCode + "\n";
            code += "       o += " + type.byteLength + ";\n";
            code += "       aa[j] = av;\n";
            code += "   }\n";
            code += "   return aa;\n"
            code += "})();\n";
            return { 
                readCode: code, 
                byteLength: type.byteLength * length, 
                defaultValue: null,
                array: true
            };
        }
    },
    
    /**
    * Defines a section of the binary data that is to be skipped over.
    * It's a bit of a pain, but you'll still need to give skipped bytes a key in your struct,
    * and you must have a unique key for each skipped section. 
    * Skipped keys will always be set to null.
    * @param length Number of bytes to be skipped
    */
    skip: {
        value: function(length) {
            return { 
                readCode: "null;\n", 
                byteLength: length, 
                defaultValue: null 
            };
        }
    },
    
    /**
    * Compiles the code to read a struct from the struct's definition
    * @param structDef Object sequentially defining the binary types to read
    * @param prototype Optional, additional prototypes to apply to the returned struct object
    * @returns An object containing a "readStructs" function that can read an array of the defined type from an ArrayBuffer
    */
    create: {
        value: function(structDef, prototype) {
            var key, type;
            
            var byteLength = 0;
            var struct = Object.create(Object.prototype, prototype);
            
            // This new struct will be assigned a unique name so that instances can be easily constructed later.
            // It is not recommended that you use these names for anything outside this class, as they are not
            // intended to be stable from run to run.
            Object.defineProperty(struct, "jsStructId", { value: "jsStructId_" + nextStructId, enumerable: true, configurable: false, writeable: false });
            Object.defineProperty(this, struct.jsStructId, { value: struct, enumerable: true, configurable: false, writeable: false });
            nextStructId += 1;
            
            // Build the code to read a single struct, calculate byte lengths, and define struct properties
            var readCode = "(function() { var st = Object.create(jsStruct." + struct.jsStructId + ");\n";
            for(key in structDef) {
                type = structDef[key];
                Object.defineProperty(struct, key, { value: type.defaultValue, enumerable: true, configurable: true, writeable: true });
                readCode += "st." + key + " = " + type.readCode + "\n";
                if(!type.array && !type.struct) {
                    readCode += "o += " + type.byteLength + ";\n";
                }
                byteLength += type.byteLength;
            }
            readCode += "return st; })();";
            
            // Build the code to read an array of this struct type
            var parseScript = "var a = new Array(count);\n var s;\n";
            parseScript += "var v = new DataView(arrayBuffer, offset);\n"; // TODO: I should be able to specify a length here (count * this.byteLength), but it consistently gives me an INDEX_SIZE_ERR. Wonder why?
            parseScript += "var o = 0;\n";
            parseScript += "for(var i = 0; i < count; ++i) {\n";
            parseScript += "    s = " + readCode + "\n";
            parseScript += "    if(callback) { callback(s); }\n";
            parseScript += "    a[i] = s;\n";
            parseScript += "}\n";
            parseScript += "return a;\n";
            
            Object.defineProperty(struct, "byteLength", { value: byteLength, enumerable: true, configurable: true, writeable: true });
            Object.defineProperty(struct, "readCode", { value: readCode, enumerable: true, configurable: true, writeable: true });
            Object.defineProperty(struct, "defaultValue", { value: null, enumerable: true, configurable: true, writeable: true });
            Object.defineProperty(struct, "struct", { value: true, enumerable: true, configurable: true, writeable: true });
            
            var parseFunc = new Function("arrayBuffer", "offset", "count", "callback", parseScript);
            Object.defineProperty(struct, "readStructs", { value: parseFunc, configurable: true, writeable: true });
            
            return struct;
        }
    },
});