module.exports = function(grunt) {

    grunt.initConfig({
        package: grunt.file.readJSON('package.json'),
        jshint: {
            files: [
                'Gruntfile.js',
                'library/**/*.js'
            ]
        },
        shell: {
            run: {
                command: [
                    'mkdir -p ./process/log',
                    'mkdir -p ./process/pid',
                    'node ./library/aws-change-dns.js --amazon:value 4.3.2.1'
                ].join('; ')
            },
            options: {
                stdout: true,
                stderr: true
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('run', ['shell:run']);

};
