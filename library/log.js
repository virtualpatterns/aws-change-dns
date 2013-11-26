define(['fs',
        'winston',
        'aws-change-dns/configuration'], function(FileSystem,
                                                  Log,
                                                  Configuration) {

    Log.add(Log.transports.File, {
        json: false,
        stream: FileSystem.createWriteStream(Configuration.get('process:logPath'), {
            flags: 'a'
        })
    });

    return Log;

});
