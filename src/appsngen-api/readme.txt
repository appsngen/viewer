HOW TO make changes to appstore.api:
1) open command line in 'appstore.api' folder and run 'grunt build', 'grunt lint', 'grunt test'.
2) review jslint errors and test results
3) edit features in 'src' folder, write/edit test specs at 'tests' folder
4) execute steps 1-2, fix errors
5) commit

COMMENTS:
1) tests
Current simple integration handshake breaks tests solution. This is why we need *.insecure.js file to perform
unit tests.
TODO: create tests solution which provides not only unit tests but integration tests (ala include jasmine runner
into iframe and create http server via node.js)