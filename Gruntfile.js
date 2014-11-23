module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-browserify');

  var BANNER = [
    '/*! <%= pkg.name %> v<%= pkg.version %> - <%= pkg.license %> license \n',
    '<%= grunt.template.today("yyyy-mm-dd") %> - <%= pkg.author %> */\n'
  ].join('');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      dist: {
        files: { "dist/playlist.min.js": ["dist/playlist.js"] }
      },
      options: {
        banner: BANNER
      }
    },

    browserify: {
      dist: {
        files: { 'dist/playlist.js': ["src/*.js"] },
        options: {
          banner: BANNER,
          browserifyOptions: {
            debug: true
          }
        }
      },
      watch: {
        files: { 'dist/playlist.js': ["src/*.js"] },
        options: {
          watch: true,
          keepAlive: true,
          browserifyOptions: {
            debug: true
          }
        }
      }
    },

    jshint: {
      files: ["src/*.js"],
      options: {
        jshintrc: '.jshintrc'
      }
    }
  });

  grunt.registerTask('default', [
      'jshint',
      'browserify:dist',
      'uglify'
  ]);

  grunt.registerTask('watch', [
      'browserify:watch',
  ]);
};
