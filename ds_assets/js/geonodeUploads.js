//Layer and document upload functions in GeoNode

//global variable to store the uploaded layer and document
var geonode_uploaded_layer_link, geonode_uploaded_document_link;

function download_shapefile(){
   //$("#citation").load();
   var options = {
    folder: 'MaskedData',
    types: {  point: 'MaskedPoints',  }
  }
  console.log("Download Masked");
  shpwrite.download(masked.reprojected, options);
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

//Converts and saves the returned shapefile from generateShapeFileFromGeoJSON() function, used to download the masked data
async function saveShapeFile(geoJSON){
  var shpBuffer = await generateShapeFileFromGeoJSON(geoJSON, fileName); 
  var base64String = Uint8Array.from(window.atob(shpBuffer), (v) => v.charCodeAt(0));
  var shapeFileBlob = new Blob([ base64String ], {type:"application/zip"});
  saveAs(shapeFileBlob, fileName + ".zip");   // see FileSaver.js
}
  
//download shapefile from memory
async function GenerateZipOfAll(){  
    var shpBuffer = await generateShapeFileFromGeoJSON(masked.reprojected, fileName); 
    var base64String = Uint8Array.from(window.atob(shpBuffer), (v) => v.charCodeAt(0));
    var shapeFileBlob = new Blob([ base64String ], {type:"application/zip"});

    var zip = new JSZip();
    zip.file(fileName + ".zip", shapeFileBlob );
    
    zip.generateAsync({  //generate zip
        type: "blob"
        }).then(function(content) {          
        saveAs(content, fileName + ".zip");   // see FileSaver.js
    });
}


//upload the masked layer as a geonode layer
async function upload_layer(masked_reprojected){ //maskedGeoJSON_string) {   //filename = "sample.geojson",
  showFileUploadSuccessMessage('Masked and encrypted datasets are being uploaded!','info'); // as a Layer and Masked Encrypted Layer being uploaded as document');
  console.log("Uploading geonode layer");  
  
  // this for for geojson  
  if(formatted_masked_reprojected === null)
      console.error('formatted_masked_reprojected is null');
  
  var fileStringArray = [ formatted_masked_reprojected ]; 
  var blobAttrs = {
     type: "application/octet-stream"
  };
  console.log('fileStringArray: ' + fileStringArray);
  fileName = fileName + '.geojson'; 
  console.log('Layer fileName: ' + fileName);

  //geoJSON
  var file = new File(fileStringArray, fileName, blobAttrs);
  
  var headers = new Headers();
  headers.set('X-CSRFToken', csrftoken);
  var formData = new FormData()
  formData.set("time", false) 
  //for geojson syntax is: 
  formData.set("base_file", file) //file 
  
  formData.set("geojson_file", file) //formData.set("geojson_file", fileInputX.files[0])
  //$$$ shapefile 
  formData.set("permissions", '{"users":{},"groups":{}}')  
  formData.set("charset", "UTF-8")  //$$formData.set("charset", "UTF-8")

    
  fetch("/upload/", {
    "credentials": "include",
    "body": formData,
    "headers": headers,
    "method": "POST",
    "mode": "cors"
  }).then(result => result.json()).then(function(data) {
    console.log(data)
    fetch(data.redirect_to).then(result => result.json()).then(function(data) {
      console.log(data)                                              //  ' + data.url + '
      showFileUploadSuccessMessage('Uploaded masked dataset as a Geonode <a href=https://datasovereignty.cloud.edu.au' + data.url + ' target="_blank" class="alert-link">layer</a>','success'); //show message to user 
      geonode_uploaded_layer_link = 'https://datasovereignty.cloud.edu.au' + data.url;
      var name = data.url.split(":").pop()  // Get layer ID
      check_layer(name)
    })
  })
  

  //For shapefiles
  //https://github.com/GeoNode/geonode/issues/8983
  //the result of fetch("/upload/" appears to return something different for a shapefile. 
  //The returned redirect_to parameter looks like /upload/srs?id=221&force_ajax=true". 
  //The presence of "srs" suggests geonode is doing something related to coordinate reprojection here. 
  //You need to make fetch requests to these redirect_urls, until the returned JSON payload has the key status: "finished". 
  //Conceptually, you're "following" the redirects specified in redirect_url. This can be implemented with a recursive function like so:
  function follow_redirects(payload) {
    console.log(payload)
    if (payload.redirect_to) {
        fetch(payload.redirect_to).then(result => result.json()).then(function(payload) {
            follow_redirects(payload)
        })
    } else {
        var name = payload.url.split(":").pop()  // Get layer ID
        check_layer(name)
    }
  }

  
}


  
  function check_layer(name) {
    // Check if layer exists with this name
    fetch("/api/v2/layers/?filter{name}=" + name).then(result => result.json()).then(function(result) {
      console.log(result)
      if (result.layers.length) {
        var layer = result.layers[0]
        var layer_id = `type:${layer.polymorphic_ctype_id}-id:${layer.pk}`
        
        console.log("Now uploading Document")   

        upload_document(layer_id, csrftoken)
      } else {
        // It doesn't exist yet, wait 1 second, then check again
        setTimeout(function() {
          check_layer(name)
        }, 1000)
      }
    })
  }
  
  //upload the 'global_finalEncryptedZipFile' blob (the final encrypted zip file resulting from the three volume encryption) as a Geonode document
  //Geoserver only accepts files with spatial content - and the encrypted file canot be read of its contents.
  function upload_document(layer_id) {
    
    var formData = new FormData()
    formData.set("csrfmiddlewaretoken", csrftoken)
    
    if (csrftoken === undefined)
       console.error('csrftoken undefined');
    
    if (global_finalEncryptedZipFile === null)
       console.error('encrypted file is null ');
  
    if (finalFilename === null)
       console.error('encrypted filename is null ');
    else
       console.log('finalFilename ' + finalFilename);
    
    formData.set("title", finalFilename); //using global variable //filename) 
    formData.set("links", layer_id)
    console.log(`Linking to ${layer_id}`)
  
    var file = new File([global_finalEncryptedZipFile], finalFilename); //blob to file
    formData.set("doc_file", file) //upload the 'global_finalEncryptedZipFile' (the final encrypted zip file resulting from the three volume encryption)
    formData.set("doc_url", "")
    //formData.set("permissions", '{"users":{"AnonymousUser":["view_resourcebase","download_resourcebase"]},"groups":{}}')
    formData.set("permissions", '{"users":{},"groups":{}}')
  
    var result = fetch("/documents/upload/", {
      "credentials": "include",
      "body": formData,
      "method": "POST",
      "mode": "cors"
    }).then(function(result) {
      console.log('New document uploaded, ' + result.url) 
      showFileUploadSuccessMessage('Uploaded encrypted layer as a Geonode <a href=' + result.url + ' target="_blank" class="alert-link"> document </a>', 'success'); //' + result.url + ' //show message to user
      geonode_uploaded_document_link = result.url;
      waitingDialog.hide();
    })
    
    if (result.status == 200) {
          console.log('New document uploaded, ' + result.url)
          showFileUploadSuccessMessage('Error Uploading encrypted layer as a Geonode <a href=' + result.url + ' target="_blank" class="alert-link"> document </a>', 'error'); //' + result.url + '//show message to user
      } else {
         console.error('error uploading: ' + result)
      }
    
  }

  function showFileUploadSuccessMessage(msg, type){
    const alertPlaceholder = document.getElementById('fileUploads')

    const alert = (message, type) => {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible fade in" role="alert">`,
        `   <div>${message}</div>`,
        '</div>'
      ].join('')

      alertPlaceholder.append(wrapper)
    }
    
    alert(msg, type) 
  }
  