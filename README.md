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
    var SimpleStruct = Struct.create(
        Struct.int8("myChar"),
        Struct.int16("myShort"),
        Struct.int32("myInt"),
        Struct.float32("myFloat")
    );
    
    var ComplexStruct = Struct.create(
        Struct.struct("myStruct", SimpleStruct), // Structs can be nested
        Struct.string("myString", 4),
        Struct.array("myArray", Struct.int8(), 4), // Primitives or other structs can be read as fixed-length arrays
        Struct.array("myStructArray", SimpleStruct, 2),
        { 
            // The last argument passed to Struct.create can be additional properties for the object
            // These properties will be available on every instance of this struct that is created
            myFunction: {
                value: function() {
                    console.log("myFunction has been called");
                }
            }
        }
    );
    
    // readStructs accepts the following arguments:
    //  arrayBuffer - the ArrayBuffer to read from
    //  offset - the byte offset into the buffer where reading should start
    //  count - the number of structs to read. Structs are assumed to be tightly packed
    // returns an array of structs
    var a = simpleStruct.readStructs(buffer, 0, 2); // Returns an array of 2 simpleStructs
    var b = complexStruct.readStructs(buffer, 32, 1); // Returns an array of 1 complexStruct
    
    // myFunction will be available on every instance of a ComplexStruct
    b[0].myFunction();