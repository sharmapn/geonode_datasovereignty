SELECT resourcebase_ptr_id, title_en, abstract_en, purpose_en, constraints_other_en, 
supplemental_information_en, data_quality_statement_en, workspace, store, "storeType", 
name, typename, charset, default_style_id, upload_session_id, elevation_regex, has_elevation, 
has_time, is_mosaic, time_regex, remote_service_id, featureinfo_custom_template, use_featureinfo_custom_template
FROM public.layers_layer;


-- add the column first
ALTER TABLE public.layers_layer
ADD column notarisation_url VARCHAR(200);

-- then in the models.py on line 194
-- \geonode\geonode\layers\models.py

geonode\base\templates\base\_resourcebase_info_panel.html LINE 34

{% if resource.date_type == 'notarisation_url' %}
    <dt>{% trans "Notarisation URL" %}</dt>
	{% endif %}


notarisation_url = models.CharField(max_length=255, default='UTF-8')

-- then restart tomcat and apache

SELECT * FROM public.people_profile
ORDER BY id ASC 

-- first add the column
ALTER TABLE public.people_profile
ADD column publickey text;

-- geonode/geonode/people/models/models.py, line 119
publickey = models.TextField(
        _('Public Key'),        
        blank=True,
        null=True,
        help_text=_('Pub key used to encrypt datasets'))

Layers
Supplemental Information No information provided