// The main Data Sovereignty tool within Geonode
// The tool calls OpenPGP encrypt-decrypt library
// Those functions for OpenPGP enc and dec are in another js file 'requestOpenPGP.js' and are called from the html pages
// So this js file is not used for enc and dec for Geonode layers using OpenPGP.  

var objFile=null;       //upload encrypted file for decryption
var hash_value;         //maybe dont need this variable
var encryptedZIPFileData_fine, encryptedZIPFileData_medium, encryptedZIPFileData_coarse; //for each encryption level, store returned encrypted blob eac time
var fileInput = null;   //uploaded file 
var isDocument = false; //if uploaded file is document
var documentExtension = null; //file extension of uploaded file
var fileName = 'empty';       // firstpart of original filename will be used as part of encrypted filename
var finalFilename = 'empty';  //final filename of the encrypted zip file
var csrftoken = $('[name="csrfmiddlewaretoken"]').attr('value'); //used to make the API POST request to the server


var global_originalmap_jsonString = null; // the global geojson, later used to send to geoserver
var global_finalEncryptedZipFile = null; //the final encrypted zip file containing all encrypted volumes
var sampleShapeFileUploaded = false; 

//for spinner and loading sample shapefile
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

loadSampleShapeFile = async function (){ 
    console.log('Load Shapefile')
    var outputID = "sensitiveTag", layerName = "sensitive";

    const req = new XMLHttpRequest();
    req.open("GET", "/static/ds_assets/kx-pup-notable-trees-SHP.zip", true);
    req.responseType = "blob";   
    req.onload = (event) => {
        const blob = req.response;
        fileToEncrypt = blob;         
        var projFileName;
        JSZip.loadAsync(blob).then(function(result){           
            myKeys = Object.keys(result.files);
            myKeys.forEach(function(i){if (i.endsWith('prj') == true ) {projFileName = i;}})
        });
        JSZip.loadAsync(blob).then(function(result){             
            projectionPromise = result.files[projFileName].async('text');
            projectionPromise.then(function(proj){projection[layerName] = proj; console.log(proj);}) //Add the projection text to the projection array and name it based on the input layer name
        });
         
        //shp accepts shapefiles and GeoJSON zipped files: https://github.com/calvinmetcalf/shapefile-js
        shp("/static/ds_assets/kx-pup-notable-trees-SHP.zip").then(function (geojson) {   //all_clusters_kamloops.zip
            console.log("Loading GeoJSON from sample shapefile")
            $("#" + outputID).html(layerName + ".data = " + JSON.stringify(geojson) + ";");
            document.getElementById("sensitiveInput").disabled = true;  //user shoud not be able to upload a file
            document.getElementById("displayMap").disabled = false;     //enable the map display            
            $message = $('.tabcontent1 span.dataset_loaded_msg');       //show dataset loaded message
            $message.text('Dataset Loaded!');
            sampleShapeFileUploaded = true;
            fileName = "kx-pup-notable-trees-SHP";                      //needed for saving the ecrypted file later
            documentExtension = "zip";                                  //needed for saving the ecrypted file later
        });   
    };
    req.send(); 
}	

// main function to zip the map and encrypt implements three-level volume encryption
async function multiLevelEncrypt(maskedData_string, maskedMedData_string){ 
    var startTime = new Date();
    console.log("Level Zipped and Encryption: ");
    var originalmap_jsonString = JSON.stringify(sensitive.data, circularReplacer());
    
    global_originalmap_jsonString = originalmap_jsonString;
    console.log("originalmap_jsonString: " + originalmap_jsonString);

    //Volume encryption
    // LEVEL 1. = fine-level = innermost level zip made first. if its level 1, add these files and send zip for encryption and then it will be used as as part of the next zip file
    console.log('Level 1 begins');
    var zipLevel1 = new JSZip();
    zipLevel1.file("original.geojson", originalmap_jsonString); //add original map file to zip file AS geoJSON
 
    zipLevel1.file(fileName + ".zip", fileInput.files[0]);      //add the original uploaded shapefile 
    zipLevel1.file("Metadata.txt", //above has values here
            "Masking parameters of Level 2 \nRandDist: " + randDist + "\nRandAngle: " + randAngle +
            "\nNote this level contains the fine level (original map) - no masked map " +
            "\n(but contains the masking parameters of the medium map - which is masked first, from one level outside ");

    
    //The zip file is now ready in a blob format. Need to encrypt and save it. encrypt this zip file again before saving
    //we have to encrypt it using certain number of terms in passphrases
    var encryptedZipFileData_Level1, encryptedZipFileData_Level2, encryptedZipFileData_Level3;
    
    try { 
        encryptedZipFileData_Level1 = await zip_callEncryption(zipLevel1, 1);  // Await for the first function to complete
    }
    catch (error) { console.error(error); }  

    // Commented these two levels, as with OpenPGP, we only encrypt at one level.     
    // Level 2. Medium-level zip should contain the medium level map, metadata and encrypted zip of fine-level (level 1)  - then zip it and then encrypt
    // Masked just one. Parameters .... masking distance, angle 
    console.log('Level 2 begins');
    
    //In OpenPGP encryption, since there is only one level currently, at level one, we put the original shapefile in the zipped encrypted file  
    //In assymmetric encryption, at this level, we store the original shapefile
    var shpBuffer = await generateShapeFileFromGeoJSON(masked.reprojected, fileName); 
    var base64String = Uint8Array.from(window.atob(shpBuffer), (v) => v.charCodeAt(0));
    var shapeFileBlob = new Blob([ base64String ], {type:"application/zip"});  //this is added later in the zipfile, see below
    
    var zipLevel2 = new JSZip();    
    zipLevel2.file("fine_level.enc", encryptedZipFileData_Level1);   //add the encrypted fine-level zip containing the map and metadata 
    zipLevel2.file(fileName + "_masked.zip", shapeFileBlob);    //add the masked dataset as shapefile 
    zipLevel2.file("mediumMap_maskedOnceUsingOneOffset.map", maskedData_string);      //map is masked using one offset      
    zipLevel2.file("Metadata.txt",
            "Masking parameters of Level 3 (Coarse) \nRandDistCoarse: " + randDistMed + "\nRandAngleCoarse: " + randAngleMed +    //ignore the `Med' in variable names - will change        
            + "\nNote this level contains the medium level map - which is masked once. The masking parameters is in one level inside, i.e. the fine level) "
            );
   
    try {
         encryptedZipFileData_Level2 = await zip_callEncryption(zipLevel2, 2); //second parameter is the level 
    }
    catch (error) { console.error(error);  } 

    console.log('Level 3 begins');
    // 3. Coarse-level zip contains the coarse level map, metadata and encrypted zip of medium-level - then zip the resultant file and encrypt it
    var zipLevel3 = new JSZip();
    //add the encrypted fine level zip containing the data/map and metadata 
    zipLevel3.file("medium_level.enc", encryptedZipFileData_Level2);   //add the encrypted medium-level zip containing the map and metadata 
    zipLevel3.file("coarseMap_maskedUsingTwoOffsets.map", maskedMedData_string);  //map is masked using two offsets
    zipLevel3.file("metadata.txt",             
                + "\nNo Masking parameters here. "
                + "\nNote this level contains the masked map of medium level (of which the masking parameters is in one level inside "
                + "Thus no masking parameters at this level): " );                        //add medium level data/map
    //encrypt this zip file again before saving. Note, we have to encrypt it using certain number of terms in passphrases
    
    //create a zip file of the coarse data and encrypt it. At this level, the encrypted file will be automatically saved. See code inside fn.
    try {
        encryptedZipFileData_Level3 = await zip_callEncryption(zipLevel3, 3);
    }
    catch (error) { console.error(error); }

    endTime = new Date();
    executionTime = ((endTime - startTime) / 1000);
    console.log("Encryption complete. Exceution Time: " + executionTime);  //'Three levels of' 
    waitingDialog.hide();
}

// Take the zip file object, generates a blob, zips it, calls encryption and returns it 
// Modified to call the the OpenPGP encryption
async function zip_callEncryption(zipFile, level) {
    return new Promise((resolve, reject)  => {
        console.log('Processing start.')             
        var encryptedZipFile, encryptedZipFileData;
        var downloadFile = false;
        //in three level encryption, we encrypt at 3 levels, unlike OpenPGP where we encryt to 1 level only
        if(level == encryptionLevelBasedOnEncryptionType) downloadFile = true;  //07-May-2022 changed so that we encrypt at level 1
        //create a zip file of the coarse data and then save it    
        //Make sure the files are not only combined, but compresed as well
        zipFile.generateAsync({type: "blob", compression: "DEFLATE"}, )  //https://stuk.github.io/jszip/
            .then(function (content) {  
                console.log('Processing middle.')           
                var arrayBuffer, fileReader = new FileReader();        
                //this function is needed as we want to first create a file using the blob and then encrypt that 
                //You can use FileReader to read the Blob as an ArrayBuffer
                fileReader.onload = function (event) { 
                    arrayBuffer = fileReader.result;
                    console.log("here fileReader.result: " + fileReader.result);
                    //Web.Crypto Commented 03-May-2022
                    encryptedZipFile = encryptData(false, fileReader.result, downloadFile, level);  //data passed is in arraybuffer format, but later should now be converted to blob again
                    //OpenPGP encryption
                    //encryptedZipFile = OpenPGPEncryptData(false, fileReader.result, downloadFile, level);
                    encryptedZipFile.then((value) => {                            
                        encryptedZipFileData = value
                        resolve(encryptedZipFileData);
                    }); 
                };
                fileReader.readAsArrayBuffer(content);
                fileReader.result;                    
            }); 
        var str = JSON.stringify(encryptedZipFileData, circularReplacer());      
    })    
}

//pass the 'masked_reprojected'
async function generateShapeFileFromGeoJSON(geoJSON, v_fileName){   
    var options = {
      //folder: v_fileName,
      types: {
          point: v_fileName, polygon: v_fileName, line: v_fileName
      }
    }
    var shpBuffer = shpwrite.zip(geoJSON, options); //console.log('shapeFile ' + shpBuffer)
    return shpBuffer;
  }
  
//Test function - works great
async function GenerateZipOfAll(){  
    var shpBuffer = await generateShapeFileFromGeoJSON(masked.reprojected, fileName); 
    var base64String_outer = Uint8Array.from(window.atob(shpBuffer), (v) => v.charCodeAt(0));
    var shapeFileBlob_outer = new Blob([ base64String_outer ], {type:"application/zip"});

    var zip = new JSZip();
    zip.file("hello.txt", "Hello[p my)6cxsw2q");
    zip.file(fileName + ".zip",shapeFileBlob_outer);
    
    zip.generateAsync({  //generate zip
        type: "blob"
        }).then(function(content) {
            
            saveAs(content, "example34.zip");   // see FileSaver.js
        });
}

//recursive unzip, decrypt and verify. keep on decrypting the encrypted file until we reach the level required by the user. Note encrypted file would be of a zip 
//level 3 = coarse, level 2 = medium, level 1 = fine. Fine indside medium which would be inside coarse
async function multiLevelDecrypt(v_objFile, levelToDecrypt, currentLevel, mainPassphrase)
{ // when this function is called at first the value for `currentLevel' should be 1, then when called recursively it increases
    console.log("Inside multiLevelDecrypt function ");
    console.log("Decryption levelToDecrypt "+  levelToDecrypt + " currentLevel " + currentLevel);  
    console.log("passphrase D: " + mainPassphrase);  

    var startTime = new Date();
    console.log("Multi Level Decryption: Started " + startTime);
    
    if(v_objFile instanceof File)
        console.log("v_objFile instanceof File " + v_objFile);  
    else
        console.log("v_objFile not instanceof File " + v_objFile)
    if (v_objFile instanceof Blob)
        console.log("v_objFile instanceof Blob " + v_objFile);
    else
        console.log("v_objFile not instanceof Blob " + v_objFile);
    console.log("passphrase D1: " + mainPassphrase); 
    //get content from file object. The `big encrypted zip file'
    var cipherbytes=await readfile(v_objFile)
    .catch(function(err){
        console.error(err);
    }); 
    console.log("passphrase D 2: " + mainPassphrase); 
    var encrypted_maskedData=new Uint8Array(cipherbytes);
    var jsonString = JSON.stringify(encrypted_maskedData, circularReplacer());

    
    var downloadFile = false;
    if (currentLevel == levelToDecrypt)
        downloadFile = true;
    
    //Web.Crypto decryption 
    let decrypted_file_data = await decryptData(encrypted_maskedData, currentLevel, downloadFile, mainPassphrase); //will automatically use the 'objFile' global variable
    //OpenPGP Decryption
    //let decrypted_file_data = await decryptOpenPGP(encrypted_maskedData, currentLevel, downloadFile); //will automatically use the 'objFile' global variable
    
    //`big encrypted zip file' is encrypted. So here we Decrypt it into file content into fileobject so we can iterate over each file
    var file = new File([decrypted_file_data], "decrypted.txt", {
        type: "text/plain",
    });
    v_objFile = file; //assign to variable used below
       
    
    //From the decrypted zip file object, we unzip each file 
    console.log("Unzipping now: "); 
    var jsZip = new JSZip();
    var fileNum =0;
    jsZip.loadAsync(v_objFile).then(function (zip) {
        Object.keys(zip.files).forEach(function (filename){
                //now we iterate over each zipped file 
                zip.files[filename].async('string').then(function (fileData){
                    console.log("\t filename: " + filename);                             
                        //if we found the map file and this is the level of which we want to show/decrypt the volume                
                    if (filename.endsWith('.geojson') == true){ 
                        console.log("\t file to decrypt: " + filename); // decrypt the file here //projFileName = i;                        
                        //we decrypt the encrypted volume at that level, display and allow user to save the decrypted file
                        
                        console.log("\t For verification. We can display the map here");                            
                        //create a file out of the `decrypted_file_data' variable
                        
                        //savezipfile(fileData, filename); //if we want to save..this works
                        console.log("\t FineNum:" + fileNum + " FileData now: " + fileData) // These are your file contents      
                    }
                    //contents of the metadata txt file
                    if (filename.endsWith('.txt') == true){
                        //console.log("\t txtfile contents: " + filename); 
                    }
                    //we look for the encrypted volume. It has an `.enc' file extension. 
                    //keep going one level down for decrypt if this is not the right level of decryption 
                    else if (filename.endsWith('.enc') == true && currentLevel != levelToDecrypt) //havent reaced the required level, we keep on decrypting
                    {
                        console.log("Calling multiLevelDecrypt function again");
                        currentLevel = currentLevel - 1; // decrement the current level
                        zip.file(filename).async('blob').then( (blob) => {                            
                            //call the recursive decryption 
                            multiLevelDecrypt(blob, levelToDecrypt,currentLevel, mainPassphrase); 
                        });                        
                    }
                })           
        })
    }).catch(err => window.alert(err)) 

    endTime = new Date();
    executionTime = ((endTime - startTime) / 1000);
    console.log("Three levels of decryption complete. Exceution Time: " + executionTime);
}

//This is the main encryption function that does the encryption
//Parameters: the 'file_contents' can be the zipped map file or a document
async function encryptData(isDocument, file_contents, downloadFile, level) {
    //if document or map we read the file content
    var plaintextbytes = new Uint8Array(file_contents);
    console.log("Encrypting Now:");
    
    //save 
    //saveAs(zip_file_contents, "example.zip");

    //get passphrase
    var mainPassphrase = document.getElementById("passphraseOutput").value;
    console.log("Main passphrase: " + mainPassphrase);

    var passphrase = preparePassphrase(mainPassphrase, level);  //prepare/reduce passphrase for the different levels
    console.log("Passphrase to use for decryption: " + passphrase);
    //
    var pbkdf2iterations=10000;
    var passphrasebytes=new TextEncoder("utf-8").encode(passphrase);
    console.log('passphrasebytes' + passphrasebytes);
    var pbkdf2salt=window.crypto.getRandomValues(new Uint8Array(8));
    console.log('pbkdf2salt' + pbkdf2salt);

    var passphrasekey=await window.crypto.subtle.importKey('raw', passphrasebytes, {name: 'PBKDF2'}, false, ['deriveBits'])
        .catch(function(err){
            console.error(err);
        });
    console.log('passphrasekey imported');

    var pbkdf2bytes=await window.crypto.subtle.deriveBits({"name": 'PBKDF2', "salt": pbkdf2salt, "iterations": pbkdf2iterations, "hash": 'SHA-256'}, passphrasekey, 384)
        .catch(function(err){
            console.error(err);
        });
    console.log('pbkdf2bytes derived');
    pbkdf2bytes=new Uint8Array(pbkdf2bytes);

    keybytes=pbkdf2bytes.slice(0,32);
    ivbytes=pbkdf2bytes.slice(32);

    var key=await window.crypto.subtle.importKey('raw', keybytes, {name: 'AES-CBC', length: 256}, false, ['encrypt'])
        .catch(function(err){
            console.error(err);
        });
    console.log('key imported');

    var cipherbytes=await window.crypto.subtle.encrypt({name: "AES-CBC", iv: ivbytes}, key, plaintextbytes)
        .catch(function(err){
            console.error(err);
        });

    if(!cipherbytes) {
        console.error("Error encrypting file.  See console log.");
    }

    cipherbytes=new Uint8Array(cipherbytes);

    //cipherbytes=new Uint8Array(cipherbytes);
    var resultbytes=new Uint8Array(cipherbytes.length+16)
    resultbytes.set(new TextEncoder("utf-8").encode('Salted__'));
    resultbytes.set(pbkdf2salt, 8);
    resultbytes.set(cipherbytes, 16);
    
    //do we need this line of code below?
    var blob=new Blob([resultbytes], {type: 'application/download'}); //resultbytes instead of plaintext    
    
    //we only download/display link when the level is right
    if(downloadFile){
        //save the blob file
        var blob2 = new Blob([resultbytes],{type: 'text/plain'} ); // save as Blob 
        
        //18-02-2022..store it as global variable so that it can be sent to geonode document endpoint, if user wants
        global_finalEncryptedZipFile = blob2; 
        
        //compute hash of the final encrypted volume file (level 3).
        const hashHex = await getHash("SHA-256", blob2)
        hash_value = hashHex;          //finally UPDATE THE GLOBAL VARIABLE 'HASH'
        hashOutput.textContent = hash_value;  //display_hash() //display hash 
        console.log('hashHex: ' + hashHex); 

        //if we have the 'doc' extension, we take it is a document, else a ma
        
        if(isDocument) //for documents  
            finalFilename = fileName + "." + documentExtension + ".enc";  //e.g. 'legislation.doc.enc'
        else           //for maps
            finalFilename = fileName + "." + documentExtension + ".enc";  // put in the zip extension - check 'documentExtension' 

        saveAs(blob2, finalFilename); //fileName2); 
        console.log('encrypted file saved: ' + finalFilename); //fileName2)         
    }   
    encryptedFileData = blob;   
    return Promise.resolve(resultbytes);
}

async function getHash(algorithm, data) { 
    //console.log("inside getHash() function");
    const main = async (msgUint8) => { // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
      const hashBuffer = await crypto.subtle.digest(algorithm, msgUint8)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    }

    //check if data is blob, processes and returns
    if (data instanceof Blob) {
      //console.log("data instanceof Blob");
      const arrayBuffer = await data.arrayBuffer()
      const msgUint8 = new Uint8Array(arrayBuffer)
      return await main(msgUint8)
    }
    const encoder = new TextEncoder()
    const msgUint8 = encoder.encode(data)
    return await main(msgUint8)
  } 

// https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop
// is also on msdn
function readfile(file){
    return new Promise((resolve, reject) => {
        var fr = new FileReader();
        fr.onload = () => {
            resolve(fr.result )
        };
        fr.readAsArrayBuffer(file);
    });
}

function parseZipFile(zipFile) {
    console.log('Parsing zip file ' + zipFile.name + ' ...');
    console.log(' -> data ' + zipFile.data);

    JSZip.loadAsync(zipFile).then(function (zip) {
        Object.keys(zip.files).forEach(function (filename) {
            zip.files[filename].async('string').then(function (fileData) {
                console.log(fileData) // These are your file contents
            })
        })
    })
}

// This function is not used for opening files all the time. It is only used in the case when user is trying on directly encrypt .
// It is also used for decryption
var openFile = function(event) {
    console.log("hello a");
    var input = event.target;
    var reader = new FileReader();
    reader.onload = function(){
        var arrayBuffer = reader.result;
        console.log(arrayBuffer.byteLength);
    };    
    objFile = input.files[0];

    console.log("File Validation (2)");
    fileValidation(2); 
};

// Main function used to decrypt files 
async function decryptData(encryptedBytes, currentLevel,  download, v_mainPassphrase){
    console.log("Decryption");
    console.log("passphrase used for Decryption: " + v_mainPassphrase);
    //Can also read the File directly. Its in another function now
    
    if(isDocument){
        console.log("File to decrypt is a Document, not a map");
    }
    else if (!isDocument) {
        console.log("File to decrypt is a map, not a document");
    }

    var cipherbytes = encryptedBytes; //

    console.log("mainPassphrase: " + v_mainPassphrase);

    var passphrase = preparePassphrase(v_mainPassphrase, currentLevel);  //prepare/reduce passphrase for the different levels
    console.log("Chosen passphrase: " + passphrase);

    var pbkdf2iterations=10000;
    var passphrasebytes=new TextEncoder("utf-8").encode(passphrase);
    var pbkdf2salt=cipherbytes.slice(8,16);

    var passphrasekey=await window.crypto.subtle.importKey('raw', passphrasebytes, {name: 'PBKDF2'}, false, ['deriveBits'])
        .catch(function(err){
            console.error(err);

        });
    console.log('passphrasekey imported');

    var pbkdf2bytes=await window.crypto.subtle.deriveBits({"name": 'PBKDF2', "salt": pbkdf2salt, "iterations": pbkdf2iterations, "hash": 'SHA-256'}, passphrasekey, 384)
        .catch(function(err){
            console.error(err);
        });
    console.log('pbkdf2bytes derived');
    pbkdf2bytes=new Uint8Array(pbkdf2bytes);

    keybytes=pbkdf2bytes.slice(0,32);
    ivbytes=pbkdf2bytes.slice(32);
    cipherbytes=cipherbytes.slice(16);

    var key=await window.crypto.subtle.importKey('raw', keybytes, {name: 'AES-CBC', length: 256}, false, ['decrypt'])
        .catch(function(err){
            console.error(err);
        });
    console.log('key imported');


    var plaintextbytes=await window.crypto.subtle.decrypt({name: "AES-CBC", iv: ivbytes}, key, cipherbytes)
        .catch(function(err){
            console.error(err);
        });

    if(!plaintextbytes) {
        console.log("Error during Decryption");
    }
        
    if(download) { //we only download/display link at the right level
        //save the blob file https://github.com/eligrey/FileSaver.js/issues/357        
        var blob = new Blob([plaintextbytes],{type: 'text/plain'} ); // save as Blob 
        var fileName2 = fileName + "_level"+ currentLevel +".zip";
        saveAs(blob, fileName2); 
        console.log('Decrypted file Level'+ currentLevel + 'saved, filename: ' + fileName2)  
        waitingDialog.hide();
    }
    return plaintextbytes;
}

function saveStaticDataToFile(ha, filename) {
    var blob = new Blob([ha],
        { type: "text/plain;charset=utf-8" });
    saveAs(blob, filename);
}

//used to display hash 
function display_hash() {
    console.log("Displaying hash: " + hash_value); 
    //if(hash_value === null)
    if (typeof hash_value == 'undefined'){
        alert("No hash to display");
        console.log('No hash to display');
    }
    else 
        hashOutput.textContent = hash_value;         //display hash    

    //enable the notarise button
    document.getElementById("notarise").disabled = false;    
}

//Call the minting function to store the hash as a public record on Ethereum
function callNotarisation() 
{    
    console.log("Fetch POSTing hash: ");
    var hash_value = hashOutput.textContent;   //testhash    
    var url = 'https://DOMAIN/posthash/';
    console.log('For ' + fileName +'.zip, fetching hash: ' + hash_value);	
    
    if (hash_value == null || typeof hash_value === 'undefined')
    {
        alert("No hash to notarise");
        console.log('No hash to notarise');
    }
    else{
        console.log('Notorising file name ' + fileName +'.zip ' + ' hash value: ' + hash_value);
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
        myHeaders.set('Authorization', 'Basic Ym1hdXNlcjpqc3QxMmRlciEyM2FlZGk=');

        var urlencoded = new URLSearchParams();
        var val = fileName +'.zip_' + hash_value; 
        urlencoded.append("hash", val );

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: urlencoded,
            redirect: 'follow'
        };

        fetch(url, requestOptions)
            .then(response => response.text())
            .then(result => {
              console.log('Transaction No. ' + result)             
              var myPath = 'https://goerli.etherscan.io/tx/'+ result;
              console.log('myPath link ' + myPath)         
              
              var text = "The filename and hash value will be minted on Ethereum Blockchain at this address."; // <br> You can check the transaction at this 
              var link = "link";             
              var fullResultText = text + link.link(myPath);           
              document.getElementById("demo1").innerHTML = text; 
              
              $('#aId').attr('href', myPath); 
              $('#aId').attr('target', '_blank');
              $('#aId').text(myPath);              
              
              $("#success").show();
              saveReceipt(result, myPath);               
            })
            .catch(error => console.log('error', error));        
        
    }        
    document.getElementById("finishProcess").disabled = false;
}

function preparePassphrase(str, level){
    console.log('passPhrase: ' + str);
    var return_passphrase;
    if(level == 1){             //use all 15 terms for fine level
        return_passphrase = str;//passphrase = passphrase.split(' ');
    }
    else if(level == 2){         
        var terms = str.split(' ');
         return_passphrase = terms[0];
        for (let i = 1; i < 10; i++){ return_passphrase = return_passphrase + ' ' + terms[i]; } //get the first 10 terms for medium level
    }
    else if(level == 3){  //get the first 5 terms for coarse level
        var terms = str.split(' ');
        return_passphrase = terms[0];
        for (let i = 1; i < 5; i++){ return_passphrase = return_passphrase + ' ' + terms[i];  }                 
    }
    return_passphrase = return_passphrase.trim();  //making sure preceding and trailing spaces are removed
    console.log("Passphrase for encryption/decryption level : " + level + " = (" + return_passphrase + ")");
    return return_passphrase;
}

//save transaction receipt						
function saveReceipt(txnNumber, fullpath){
    /*
    Before Clicking the submit mint
        Should the user choose the minting priorty? low, medium, or high?
        Here are the fees:
            gas fees:
            priority fees:
            our charges: 

    After clicking the submit mint
        Here is a record of the transaction
        You have paid us X.XX for the trsnaction
        We expect that your transaction will be put/minted on the blockchain in X amount time.
        The transaction number is
        You can find the hash o fthe encrypted file stpored on the bloachain at the following address, 
        once its minted

    Save this record as a pdf file.
    */
    
    finalFilename = 'test.enc.zip'
    var date = new Date()    
    console.log('Saving Receipt');
    const doc = new jsPDF(); //'p','in','letter'   
    
    doc.text("Indigenous Data Sovereignty Tool", 25, 10);    
    doc.setFontSize(12);
    doc.text(25, 27,"Department of Environment");
    doc.text(25, 33,"The University of Auckland");
    doc.setFontType('normal');
    //doc.text("Transaction Record! for " + finalFilename, 25, 30);
    doc.text(25, 51, "Transaction Record!");
    doc.setFontSize(11);
    doc.text("Date: " + date, 25, 57)
        
    //A hash value of the shapefile
    doc.text(25, 72,'The original dataset has been:'); // masked and uploaded as a Geonode layer and encrypted and uploaded as a Geonode document.')
    
    doc.setFontSize(10);
    doc.text(25, 79,  'masked and uploaded as a Geonode layer at ');
    doc.setTextColor(0, 0, 255); //blue color text
    doc.text(55, 79, geonode_uploaded_layer_link); //finalFilename); 

    doc.setTextColor(0, 0, 0); //black color text
    doc.text(25, 86,  'encrypted and uploaded as a Geonode document at ');
    doc.setTextColor(0, 0, 255); //blue color text
    doc.text(45, 86, geonode_uploaded_document_link); //finalFilename); 

    doc.setTextColor(0, 0, 0); //black color text
    doc.text(25, 92, 'The hash value (SHA256) of this encrypted document will be soon minted on the Ethereum blockchain.')
    
    doc.setFontSize(12);
    doc.text(25, 104, "Notarisation Details");
    doc.setFontSize(10);
    
    doc.setTextColor(0, 0, 0); //black color text
    doc.text(25, 111, 'Hash Value: ');
    doc.setTextColor(0, 0, 255); //blue color text
    doc.text(45, 111, hash_value);
    doc.setTextColor(0, 0, 0); //black color text
    
    doc.text(25, 118, 'Ethereum blockchain minting address:');
    
    doc.setTextColor(0, 0, 255); //blue color text    
    doc.text(25, 124, fullpath);
    doc.setTextColor(0, 0, 0); //black color text
    
    doc.text(25, 220, 'Integrated biosecurity surveillance project')
    doc.text(25, 225, 'New Zealand Biological Heritage - National Science Challenges')
    doc.text(25, 230, 'https://bioheritage.nz/research/integrated-surveillance/')

    // generate pdf    
    doc.save("receipt"+finalFilename+".pdf");
}
  

//This function is currently used. It saves one file only - ciphertext
function savezipfile(data,filename) {
    var zip = new JSZip();
    zip.file(filename+".zip", data); //encoded, "Hello World\n"
    console.log("Console: Save zip file " + filename);
    zip.generateAsync({type: "blob"})
        .then(function (content) {
            // see FileSaver.js
            saveAs(content, filename + ".zip");
        });
}

function savezipfilecontent(data,filename) {
    var blob = new Blob(data, {type: "application/zip"}); 
    saveAs(blob, filename + ".zip");
}

function convertStringToArrayBuffer(str) {
    var encoder = new TextEncoder("utf-8");
    return encoder.encode(str);
}
function convertArrayBuffertoString(buffer) {
    var decoder = new TextDecoder("utf-8");
    return decoder.decode(buffer);
}

const circularReplacer = () => {
    // Creating new WeakSet to keep
    // track of previously seen objects
    const seen = new WeakSet();

    return (key, value) => {
        // If type of value is an
        // object or value is null
        if (typeof(value) === "object"
            && value !== null) {

            // If it has been seen before
            if (seen.has(value)) {
                return;
            }
            // Add current value to the set
            seen.add(value);
        }

        // return the value
        return value;
    };
};

function str2bytes (str) {
   var bytes = new Uint8Array(str.length);
   for (var i=0; i<str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes;
}

function status(res) {
    if (!res.ok) {
        return Promise.reject()
    }
    return res;
}