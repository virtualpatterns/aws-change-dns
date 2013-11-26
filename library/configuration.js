define(['nconf'], function(Configuration) {

    Configuration
        .argv()
        .env({
            separator: '_'
        })
        .file({
            file: './configuration.json'
        });

    return Configuration;

});
