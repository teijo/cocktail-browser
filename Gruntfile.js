module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    shell: {
      compass: {
        command: 'compass compile'
      }
    },
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: [
          "lib/jquery-1.8.3.min.js",
          "lib/Bacon-1ab32ffb.min.js",
          "lib/lodash-v1.0.0-rc.3.min.js",
          "lib/handlebars-1.0.rc.2.js",
          "lib/chosen-0.9.11/chosen.jquery.min.js",
          "app.js"
        ],
        dest: '<%= pkg.name %>.js'
      },
      css: {
        src: [
          "lib/chosen-0.9.11/chosen.css",
          "app.css"
        ],
        dest: '<%= pkg.name %>.css'
      }
    },
    cssmin: {
      dist: {
        files: {
          '<%= pkg.name %>.min.css': '<%= pkg.name %>.css'
        }
      }
    },
    uglify: {
      options: {
        compress: true,
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          '<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-css');

  grunt.registerTask('default', ['shell', 'concat', 'uglify', 'cssmin']);
};
