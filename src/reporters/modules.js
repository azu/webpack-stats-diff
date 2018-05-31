"use strict";

const colors = require("chalk");
const ui = require("cliui")({
    width: 200
});

const emptyChunk = {
    modules: []
};

module.exports = {
    buildDiffObject(reporterName, stats, options) {
        const filterByName = names => chunks => {
            if (names.length === 0) {
                return chunks;
            }
            return chunks.filter(chunk =>
                names.find(name => {
                    return name === chunk.names[0];
                })
            );
        };
        const getChunksByName = filterByName(options.modules);
        const buildDiffObject = (chunk = emptyChunk) => {
            if (!chunk.modules) {
                throw new Error("No chunk module data available.");
            }
            return {
                name: chunk.names[0],
                modules: chunk.modules
            };
        };

        const [leftModules, rightModules] = stats
            // Loop through all the chunks and filter out the only ones we need
            .map(({ chunks }) => getChunksByName(chunks))
            // Extract only the data we need for the diff.
            .map(requestedChunks => requestedChunks.map(buildDiffObject));

        const mapModuleDiff = (leftModules, rightModules) => {
            return leftModules.map((chunk, index) => {
                return {
                    name: chunk.name,
                    modules: chunk.modules
                        .filter(leftModule => {
                            const rightElement = rightModules[index];
                            const rightModule = rightElement.modules.find(
                                rightModule => rightModule.name === leftModule.name
                            );
                            const isAddOrRemoved = !rightElement || !rightModule;
                            if (isAddOrRemoved) {
                                return true;
                            }
                            if (rightModule) {
                                return leftModule.size !== rightModule.size;
                            }
                            return false;
                        })
                        .map(module => {
                            return {
                                name: module.name,
                                size: module.size
                            };
                        })
                };
            });
        };

        return {
            addedFiles: mapModuleDiff(rightModules, leftModules),
            removedFiles: mapModuleDiff(leftModules, rightModules)
        };
    },

    buildLogString(reporterName, { addedFiles, removedFiles }, options) {
        let totalDiff = 0;
        addedFiles.forEach((addedChunkInfo = emptyChunk, index) => {
            const removedChunkInfo = removedFiles[index] || emptyChunk;
            const { modules: removedModules } = removedChunkInfo;
            const { modules: addedModules } = addedChunkInfo;
            const name = addedChunkInfo.name || removedChunkInfo.name;

            const longestList = addedModules.length > removedModules.length ? addedModules : removedModules;

            ui.div(`Removed files from ${name}`, `Added files ${name}`, "Before(byte)" + " " + "After(byte)");

            longestList.forEach((dontNeedThis, index) => {
                const removedModule = removedModules[index] || {};
                const addedModule = addedModules[index] || {};
                totalDiff += (addedModule.size || 0) - removedModule.size || 0;
                ui.div(
                    colors.red(removedModule.name || "-"),
                    colors.green(addedModule.name || "-"),
                    colors.red(removedModule.size || "-") + " -> " + colors.green(addedModule.size || "-")
                );
            });
        });

        ui.div("Total diff", totalDiff <= 0 ? colors.green(totalDiff) : colors.red(totalDiff));

        return ui.toString();
    }
};
