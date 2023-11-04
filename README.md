# Indigenous Geospatial Data sovereignty web application integrated within Geonode

**Changes to Layers upload and Layer detail pages**

Included in this repository are files that need to be placed in the right directories.

- the layer_upload.html file to be placed at `geonode\geonode\layers\templates\upload\'

- the layer_detail.html file to be placed at `geonode\geonode\layers\templates\layers\'

- the base.html file to be placed at `geonode\geonode\templates\'

- the Javascript files (ds_assets folder) to be placed in the static directory. This may be different for different installations.

**Geonode user's public key**

To accommodate the storage of each geonode user's public key and population, the following SQL code has to be executed, and slight changes have to be made to code in some files:

-- First, add the column to the database table
```
ALTER TABLE public.people_profile ADD column publickey text;
```

Then changes to these files
- views.py (geonode\geonode\views.py)
```
def ajax_lookup(request):
  ...
  json_dict = {
        'users': [({'username': u.username, 'publickey': u.publickey}) for u in users],
        'count': users.count(),
    }
```

- models.py (geonode\geonode\people\models.py)  line 119
```
class Profile(AbstractUser):
   ....
   publickey = models.TextField(
        _('Public Key'),        
        blank=True,
        null=True,
        help_text=_('Pub key used to encrypt datasets'))   
```

- _permissions_form.html (geonode\geonode\templates\ _permissions_form.html)
```
 $(id).select2({
 ....
 if (data.users.length)
    return {    //modified
      results: data.users.map(d => ({ id: d.username, name: d.username , publickey: d.publickey })),
      pagination: {
        // more: !!data.paging.next
        more: false
      }
       ...
       ...
	templateSelection: function (item) { 
	    // new code 
	    //if (!window.users) window.users = []
	   //   window.users.push(item)
	    if (!window.users) window.users = {}
	      window.users[item.id] = item
	    return item.name; 
	    }
```

**Notarisation URL**

Now that we have found a way to store and retrieve the public key, I will try to store each Ethereum Blockchain Transaction URL where the hash value for each layer (encrypted) is stored.
Am following the guide from here https://training.geonode.geo-solutions.it/GN4/055_project_customize_model.html

To accommodate the storage of the URL where each layer's hash value has been notarised, the following SQL code has to be executed, and slight changes have to be made to code in some files:

-- First, add the column to the database table

```
ALTER TABLE public.layers_layer ADD column notarisation_url VARCHAR(200);
```

-- then in the models.py on line 194 (\geonode\geonode\layers\models.py)
```
    charset = models.CharField(max_length=255, default='UTF-8')

    -- add this code after the above line
    notarisation_url = models.CharField(max_length=2048, default='') 
```

Then in the geonode\geonode\base\forms.py
```
    supplemental_information = forms.CharField(
        label=_('Supplemental information'),
        required=False,
        widget=TinyMCE())
    
    --- add this block of code after the above block
    notarisation_url = forms.CharField(
        label=_('Notarisation URL 2'),
        required=False,
        widget=TinyMCE())
        #widget=forms.HiddenInput())
```

Then in the geonode\geonode\layers\templates\layouts\panels.html 
```
	<div>
	    <span><label for="{{ layer_form.supplemental_information|id }}">{{ layer_form.supplemental_information.label }}</label></span>
	    <!--<p class="xxs-font-size">(Any other descriptive information about the dataset)</p>-->
	    {{ layer_form.supplemental_information }}

	    --- add this block of code after the above block
	    <span><label for="{{ layer_form.notarisation_url|id }}">{{ layer_form.notarisation_url.label }}</label></span>
	    <!--<p class="xxs-font-size">(Any other descriptive information about the dataset)</p>-->
	    {{ layer_form.notarisation_url }}
	</div>
```

Then in the geonode\base\templates\base\\_resourcebase_info_panel.html
```
   {% if resource.abstract %}
       <dt>{% trans "Abstract" %}</dt>
       <dd itemprop="description">{{ resource.abstract|safe }}</dd>
    {% endif %}

    -- add this block of code after the above block - remove the if condition, if the fields does not show up
    {% if resource.notarisation_url %}
      <dt>{% trans "Notarisation URL" %}</dt>
      <dd itemprop="notarisation_url">{{ resource.notarisation_url|safe }}</dd>
    {% endif %}
```

