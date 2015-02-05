module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        jshint: {
            options: grunt.file.readJSON('../../.hooks/jshint/config.json'),
            toConsole: {
                src: [
                    'src/**/*.js',
                    'tests/**/*.js',
                    'Gruntfile.js'
                ]
            },
            toFile: {
                options: {
                    reporter: 'jslint',
                    reporterOutput: '.out/jshint/jshint.xml'
                },
                src: ['src/**/*.js']
            }
        },
        mochacli: {
            options: {
                require: ['should'],
                //reporter: 'tap',
                bail: true
            },
            all: ['tests/*.js']
        },
        /* jshint camelcase: false */
        mocha_istanbul: {
            coverage: {
                src: [
                    'tests/*.js'
                ]
            }
        }
        /* jshint camelcase: true */
    });
    grunt.loadNpmTasks('grunt-mocha-istanbul');
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('test', ['mochacli']);
    grunt.registerTask('check', ['jshint']);
    grunt.registerTask('coverage', ['mocha_istanbul:coverage']);
};
