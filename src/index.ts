import process from "process";

import ts from "typescript";
import { Node, Project } from "ts-morph";

export const trimQuotes = (str: string) => {
  return str.slice(1, -1);
};

export const getTsConfig = () => {
  const tsConfigFilePath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);
  if (tsConfigFilePath) {
    const configFile = ts.readConfigFile(tsConfigFilePath, ts.sys.readFile);
    return ts.parseJsonConfigFileContent(configFile.config, ts.sys, "");
  }
};

export const getDependant = () => {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
  });
  const sourceFiles = project.getSourceFiles("test/test-project/**/*.ts");
  const tsConfig = getTsConfig();

  if (tsConfig) {
    const fileDepsSet: Record<string, Set<string>> = {};
    for (const sourceFile of sourceFiles) {
      sourceFile.forEachDescendant((node) => {
        const currentFilePath = sourceFile.getFilePath();
        if (Node.isImportDeclaration(node)) {
          const moduleSpecifier = node.getModuleSpecifier();

          const moduleName = trimQuotes(moduleSpecifier.getText());
          const resolvedModuleName = ts.resolveModuleName(
            moduleName,
            currentFilePath,
            tsConfig.options,
            ts.sys
          );
          if (resolvedModuleName.resolvedModule?.resolvedFileName) {
            if (fileDepsSet[currentFilePath]) {
              fileDepsSet[currentFilePath].add(
                resolvedModuleName.resolvedModule.resolvedFileName
              );
            } else {
              fileDepsSet[currentFilePath] = new Set([
                resolvedModuleName.resolvedModule.resolvedFileName,
              ]);
            }
          }
        }
      });
    }

    const fileDeps: Record<string, string[]> = {};
    for (const fileDepsKey in fileDepsSet) {
      fileDeps[fileDepsKey] = [...fileDepsSet[fileDepsKey]];
    }
    return fileDeps;
  }
};

export const getUsedBy = (path: string) => {
  const dependants = getDependant();
  const usedBy: string[] = [];
  for (const dependant in dependants) {
    if (dependants[dependant].includes(path)) {
      usedBy.push(dependant);
    }
  }
  return usedBy;
};
