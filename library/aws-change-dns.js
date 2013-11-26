var Require = require('requirejs');

Require.config({
    nodeRequire: require,
    paths: {
        'aws-change-dns': '.'
    }
});

Require(['async',
         'aws-sdk',
         'fs',
         'aws-change-dns/configuration',
         'aws-change-dns/log'], function(Asynchronous,
                                         AWS,
                                         FileSystem,
                                         Configuration,
                                         Log) {

    process.once('uncaughtException', function(error) {
        Log.error('ERROR  process.once(' + JSON.stringify('uncaughtException') + ', function("' + error + '"))');
        if (error.stack)
            error.stack.split('\n').forEach(function(item) {
                Log.error('       ' + item);
            });
        setTimeout(function() {
            process.exit();
        }, 5000);
    });

    Log.info(' START  ' + JSON.stringify(__filename) + ' process.pid=' + JSON.stringify(process.pid));

    process.once('exit', function() {
        Log.info(' FINISH ' + JSON.stringify(__filename) + ' process.pid=' + JSON.stringify(process.pid));
    });

    if (FileSystem.existsSync(Configuration.get('process:pidPath'))) {
        Log.error('ERROR  FileSystem.existsSync(' + JSON.stringify(Configuration.get('process:pidPath')) + ')');
        setTimeout(function() {
            process.exit();
        }, 5000);
    }
    else {

        FileSystem.writeFileSync(Configuration.get('process:pidPath'), process.pid);

        process.once('exit', function() {
            if (FileSystem.existsSync(Configuration.get('process:pidPath')))
                FileSystem.unlinkSync(Configuration.get('process:pidPath'));
        });

        process.once('SIGINT', function() {
            Log.info(' IN     process.once(' + JSON.stringify('SIGINT') + ', function())');
            setTimeout(function() {
                process.exit();
            }, 5000);
        });
        process.once('SIGTERM', function() {
            Log.info(' IN     process.once(' + JSON.stringify('SIGTERM') + ', function())');
            setTimeout(function() {
                process.exit();
            }, 5000);
        });

        AWS.config.update({
            accessKeyId: Configuration.get('amazon:accessKey'),
            maxRetries: Configuration.get('amazon:retry'),
            region: Configuration.get('amazon:region'),
            secretAccessKey: Configuration.get('amazon:secretKey'),
            sslEnabled: Configuration.get('amazon:ssl')
        });

        var service = new AWS.Route53();

        Asynchronous.waterfall([
            function(callback) {
                service.getHostedZone({
                    Id: Configuration.get('amazon:hostedZoneId')
                }, callback);
            },
            function(data, callback) {

                Log.info('        --------------------------------------------------------------------------------');
                Log.info('         Hosted Zone');
                Log.info('        --------------------------------------------------------------------------------');
                Log.info('         Id: ' + JSON.stringify(data.HostedZone.Id));
                Log.info('         Name: ' + JSON.stringify(data.HostedZone.Name));
                Log.info('         Name Servers: ');

                for (var i = 0; i < data.DelegationSet.NameServers.length; i ++) {
                    var nameServer = data.DelegationSet.NameServers[i];
                    Log.info('          ' + JSON.stringify(nameServer));
                }

                service.listResourceRecordSets({
                    HostedZoneId: Configuration.get('amazon:hostedZoneId'),
                    MaxItems: "1",
                    StartRecordName: Configuration.get('amazon:resourceRecordName'),
                    StartRecordType: 'A'
                }, callback)

            },
            function(data, callback) {

                Log.info('        --------------------------------------------------------------------------------');
                Log.info('         Record');
                Log.info('        --------------------------------------------------------------------------------');

                var resourceRecordSet = data.ResourceRecordSets[0];

                Log.info('         Name: ' + JSON.stringify(resourceRecordSet.Name));
                Log.info('         Type: ' + JSON.stringify(resourceRecordSet.Type));
                Log.info('         TTL: ' + JSON.stringify(resourceRecordSet.TTL));
                Log.info('         Value: ' + JSON.stringify(resourceRecordSet.ResourceRecords[0].Value));

                if (resourceRecordSet.ResourceRecords[0].Value === Configuration.get('amazon:value')) {
                    Log.info('        --------------------------------------------------------------------------------');
                    Log.info('         No change is required');
                    Log.info('        --------------------------------------------------------------------------------');
                }
                else {

                    Log.info('        --------------------------------------------------------------------------------');
                    Log.info('         Submitting change to ' + JSON.stringify(Configuration.get('amazon:value')));

                    service.changeResourceRecordSets({
                        ChangeBatch: {
                            Changes: [
                                {
                                    Action: 'DELETE',
                                    ResourceRecordSet: {
                                        Name: resourceRecordSet.Name,
                                        Type: resourceRecordSet.Type,
                                        ResourceRecords: [
                                            {
                                                Value: resourceRecordSet.ResourceRecords[0].Value
                                            }
                                        ],
                                        TTL: resourceRecordSet.TTL
                                    }
                                },
                                {
                                    Action: 'CREATE',
                                    ResourceRecordSet: {
                                        Name: resourceRecordSet.Name,
                                        Type: resourceRecordSet.Type,
                                        ResourceRecords: [
                                            {
                                                Value: Configuration.get('amazon:value')
                                            }
                                        ],
                                        TTL: resourceRecordSet.TTL
                                    }
                                }
                            ]
                        },
                        HostedZoneId: Configuration.get('amazon:hostedZoneId')
                    }, callback)
                }

            },
            function(data, callback) {

                if (data) {
                    Log.info('        --------------------------------------------------------------------------------');
                    Log.info('         Change');
                    Log.info('        --------------------------------------------------------------------------------');
                    Log.info('         Id: ' + JSON.stringify(data.ChangeInfo.Id));
                    Log.info('         Status: ' + JSON.stringify(data.ChangeInfo.Status));
                    Log.info('         Submitted At: ' + JSON.stringify(data.ChangeInfo.SubmittedAt));
                    Log.info('        --------------------------------------------------------------------------------');
                }

                callback();

            }
        ], function (error) {
            if (error) {
                Log.error('ERROR  "' + error + '"');
                setTimeout(function() {
                    process.exit();
                }, 5000);
            }
        });

    }

});
