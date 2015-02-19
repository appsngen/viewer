module.exports = function (grunt) {
    'use strict';
    // Project configuration.
    grunt.initConfig({
        meta: {
            src: 'src',
            out: './'
        },

        clean: {
            out: {
                src: [
                    '<%= meta.out %>/500.html',
                    '<%= meta.out %>/legacy.html',
                    '<%= meta.out %>/notFound.html',
                    '<%= meta.out %>/underConstr.html'
                ]
            }
        },
        inline: {
            500: {
                src: '<%= meta.src %>/500.html',
                dest: '<%= meta.out %>/500.html'
            },
            legacy: {
                src: '<%= meta.src %>/legacy.html',
                dest: '<%= meta.out %>/legacy.html'
            },
            notFound: {
                src: '<%= meta.src %>/notFound.html',
                dest: '<%= meta.out %>/notFound.html'
            },
            underConstr: {
                src: '<%= meta.src %>/underConstr.html',
                dest: '<%= meta.out %>/underConstr.html'
            }
        },

        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    minifyCSS: true
                },
                files: {
                    '<%= meta.out %>/500.html': '<%= meta.out %>/500.html',
                    '<%= meta.out %>/legacy.html': '<%= meta.out %>/legacy.html',
                    '<%= meta.out %>/notFound.html': '<%= meta.out %>/notFound.html',
                    '<%= meta.out %>/underConstr.html': '<%= meta.out %>/underConstr.html'
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-inline');

    grunt.registerTask('default', ['clean', 'inline', 'htmlmin']);
};