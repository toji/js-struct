jsStruct
=======================

Typed Arrays have made parsing binary files much more reasonable in Javascript, but we still lack the simplicity
of c-style struct reading, where you can simply point a struct at a memory offset and read it. This utility
attempts to provide the same convenience in Javascript, in a reasonably efficient manner.

Better documentation should be forthcoming. Library is currently supports reading only, will probably add write in the future.

Sample
-------------

    // buffer may also come from an XHR request with responseType = "arraybuffer"
    var buffer = new ArrayBuffer(128); // Assume the buffer is populated with sensible binary data
    
    // Define the struct layout
    var simpleStruct = jsStruct.create({
        myChar: jsStruct.int8,
        myShort: jsStruct.int16,
        myInt: jsStruct.int32,
        myFloat: jsStruct.float32,
    });
    
    var complexStruct = jsStruct.create({
        myStruct: simpleStruct, // Structs can be nested
        myString: jsStruct.string(4), // ASCII only for the time being
        myArray: jsStruct.array(jsStruct.int8, 4),
        myStructArray: jsStruct.array(simpleStruct, 2), // Structs can also be read as nested arrays
    });
    
    // readStructs accepts the following arguments:
    //  arrayBuffer - the ArrayBuffer to read from
    //  offset - the byte offset into the buffer where reading should start
    //  count - the number of structs to read. Structs are assumed to be tightly packed
    // returns an array of structs
    var a = simpleStruct.readStructs(buffer, 0, 2); // Returns an array of 2 simpleStructs
    var b = complexStruct.readStructs(buffer, 32, 1); // Returns an array of 1 complexStruct