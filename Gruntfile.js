module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        jshint: {
            options: grunt.file.readJSON('../../../../../Portal/git/appsngen/.hooks/jshint/config.json'),
            toConsole: {
                src: ['modules/*.js', 
                        '*.js', 
                        'content/js/*.js']
            },
            toFile: {
                options: {
                    reporter: 'jslint',
                    reporterOutput: '.out/jshint/jshint.xml'
                },
                src: ['modules/*.js', 
                        '*.js', 
                        'content/js/*.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('check', ['jshint']);
};
