module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        clean: {
            doc: ['dist/docs'],
            build: [
                'dist/appsngen.widget.api.js',
                'dist/appsngen.widget.api.min.js',
                'dist/appsngen.widget.api.insecure.js',
                'dist/appsngen.container.api.js',
                'dist/appsngen.container.api.min.js'
            ],
            lint: ['dist/lint'],
            test: ['dist/tests', 'dist/coverage'],
            deploy: {
                src: [
                    '../../content/js/appsngen.widget.api.js',
                    '../../content/js/appsngen.container.api.js'
                ],
                options: {
                    force: true
                }
            }
        },
        copy: {
            deploy: {
                expand: true,
                src: ['appsngen.widget.api.min.js', 'appsngen.container.api.min.js'],
                dest: '../../content/js/',
                cwd: 'dist/',
                rename: function(dest, src) {
                    return dest + src.replace('.min', '');
                }
            },
            'deploy-dev': {
                expand: true,
                src: ['appsngen.widget.api.js', 'appsngen.container.api.js'],
                dest: '../../content/js',
                cwd: 'dist/'
            }
        },
        concat: {
            widget: {
                src: [
                    // util
                    'src/util/util.js',

                    // config
                    'src/config/config.js',

                    //dataSourceProxy
                    'src/dataSourceProxy/dataSourceProxy.js',

                    // appsngen.ajax
                    'src/ajax/ajax.js',

                    // appsngen.socket
                    'src/socket/socket.js',

                    // appsngen.prefs
                    'src/prefs/prefs.js',

                    // appsngen.symbology
                    'src/symbology/symbology.js',

                    // appsngen.events
                    'src/events/events.js',

                    // appsngen.events.metadata
                    'src/events.metadata/events.metadata.widget.js',

                    // appsngen.dynamicHeight
                    'src/dynamicHeight/dynamicHeight.common.js',

                    // appsngen.dynamicHeight
                    'src/dynamicHeight/dynamicHeight.widget.js',

                    // appsngen.resource
                    'src/resource/resource.js',

                    // browserSupport
                    'src/browserSupport/browserSupport.js',

                    // appsngen.integration
                    'src/integration/integration.js',

                    //simple security
                    'src/security/security.common.js',

                    //simple security
                    'src/security/security.widget.js',

                    // appsngen.resize
                    'src/widgetResize/widgetResize.js',

                    // appsngen.ready
                    'src/ready/ready.widget.js'
                ],
                dest: 'dist/appsngen.widget.api.js'
            },
            widgetInsecure: {
                src: [
                    // util
                    'src/util/util.js',

                    // config
                    'src/config/config.js',

                    //dataSourceProxy
                    'src/dataSourceProxy/dataSourceProxy.js',

                    // appsngen.ajax
                    'src/ajax/ajax.js',

                    // appsngen.socket
                    'src/socket/socket.js',

                    // appsngen.prefs
                    'src/prefs/prefs.js',

                    // appsngen.symbology
                    'src/symbology/symbology.js',

                    // appsngen.events
                    'src/events/events.js',

                    // appsngen.events.metadata
                    'src/events.metadata/events.metadata.widget.js',

                    // appsngen.dynamicHeight
                    'src/dynamicHeight/dynamicHeight.common.js',

                    // appsngen.dynamicHeight
                    'src/dynamicHeight/dynamicHeight.widget.js',

                    // appsngen.resource
                    'src/resource/resource.js',

                    // browserSupport
                    'src/browserSupport/browserSupport.js',

                    // appsngen.integration
                    'src/integration/integration.js',

                    //simple security
                    'src/security/security.common.js',

                    //simple security
                    /*'src/security/security.widget.js',*/

                    // appsngen.resize
                    'src/widgetResize/widgetResize.js',

                    // appsngen.ready
                    'src/ready/ready.widget.js'
                ],
                dest: 'dist/appsngen.widget.api.insecure.js'
            },
            container: {
                src: [
                    // util
                    'src/util/util.js',

                    // appsngen.events
                    'src/events/events.js',

                    // appsngen.events.metadata
                    'src/events.metadata/events.metadata.container.js',

                    // appsngen.dynamicHeight
                    'src/dynamicHeight/dynamicHeight.common.js',

                    // appsngen.integration
                    'src/integration/integration.js',

                    //simple security
                    'src/security/security.common.js',

                    // appsngen.ready
                    'src/ready/ready.container.js'
                ],
                dest: 'dist/appsngen.container.api.js'
            }
        },
        uglify: {
            widget: {
                src: 'dist/appsngen.widget.api.js',
                dest: 'dist/appsngen.widget.api.min.js',
                options: {
                    sourceMap: false,
                    sourceMapName: 'appsngen.widget.api.min.map'
                }
            },
            container: {
                src: 'dist/appsngen.container.api.js',
                dest: 'dist/appsngen.container.api.min.js',
                options: {
                    sourceMap: false,
                    sourceMapName: 'appsngen.container.api.min.map'
                }
            }
        },
        yuidoc: {
            compile: {
                name: 'API Documentation',
                version: '0.1',
                url: '',
                options: {
                    exclude: 'thirdparty,tests,dist,node_modules',
                    paths: '.',
                    themedir: 'docs/themes/appsNgen',
                    outdir: 'dist/docs'
                }
            }
        },
        jshint: {
            options: grunt.file.readJSON('../../../../.hooks/jshint/config.json'),
            toConsole: {
                src: ['src/**/*.js', 'tests/*.js']
            },
            toFile: {
                options: {
                    reporter: 'jslint',
                    reporterOutput: 'dist/lint/lint.xml'
                },
                src: ['src/**/*.js', 'tests/*.js']
            }
        },
        jasmine: {
            'widget': {
                'src': [
                    'dist/appsngen.widget.api.insecure.js'
                ],
                'options': {
                    'vendor': [
                        'tests/appsngen.widget.api.mock.js'
                    ],
                    'specs': [
                        'tests/appsngen.widget.api.spec.js'
                    ],
                    'junit': {
                        'path': 'dist/tests',
                        'consolidate': false
                    },
                    'keepRunner': false,
                    'template': require('grunt-template-jasmine-istanbul'),
                    'templateOptions': {
                        'coverage': 'dist/coverage/widget-coverage.json',
                        'report': [
                            {
                                'type': 'lcov',
                                'options': {
                                    'dir': 'dist/coverage/widget'
                                }
                            },
                            {
                                type: 'text-summary'
                            }
                        ]
                    }
                }
            },
            'container': {
                'src': [
                    'dist/appsngen.container.api.js'
                ],
                'options': {
                    'vendor': [
                        'tests/appsngen.container.api.mock.js'
                    ],
                    'specs': [
                        'tests/appsngen.container.api.spec.js'
                    ],
                    'junit': {
                        'path': 'dist/tests',
                        'consolidate': false
                    },
                    'keepRunner': false,
                    'template': require('grunt-template-jasmine-istanbul'),
                    'templateOptions': {
                        'coverage': 'dist/coverage/container-coverage.json',
                        'report': [
                            {
                                'type': 'lcov',
                                'options': {
                                    'dir': 'dist/coverage/container'
                                }
                            },
                            {
                                type: 'text-summary'
                            }
                        ]
                    }
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-yuidoc');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');

    grunt.registerTask('build', ['clean:build', 'concat', 'uglify']);
    grunt.registerTask('doc', ['clean:doc', 'yuidoc']);
    grunt.registerTask('lint', ['clean:lint', 'jshint']);
    grunt.registerTask('test', ['clean:test', 'jasmine']);
    grunt.registerTask('deploy', ['clean:deploy', 'copy:deploy']);
    grunt.registerTask('deploy-dev', ['clean:deploy', 'copy:deploy-dev']);
};
