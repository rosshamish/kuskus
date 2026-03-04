import * as path from "path";
/* eslint-disable-next-line import/no-extraneous-dependencies */
import * as Mocha from "mocha";
/* eslint-disable-next-line import/no-extraneous-dependencies */
import * as glob from "glob";

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "bdd",
    color: true,
  });

  const testsRoot = path.resolve(__dirname, "..");

  return new Promise((c, error) => {
    glob("**/**.test.js", { cwd: testsRoot }, (globErr, files) => {
      if (globErr) {
        error(globErr);
        return;
      }

      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) {
            error(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        error(err);
      }
    });
  });
}
