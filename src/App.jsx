import { useState } from "react";
import STLPreview from "./STLPreview";

function App() {
  // top-level state for managing all batch operations
  const [operations, setOperations] = useState([]);

  // list of extensions considered image-previewable
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];

  // add a new operation block with default values
  const addOperation = () => {
    setOperations((prev) => [
      ...prev,
      {
        id: Date.now(), // unique-ish id
        files: [],
        newNames: {},
        destination: "",
        subfolder: "",
        previewVisibility: {},
        expanded: true,
      },
    ]);
  };

  // collapse or expand an operation block
  const toggleOperation = (id) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, expanded: !op.expanded } : op))
    );
  };

  // remove an entire operation
  const removeOperation = (id) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  };

  // select files and add them to the current operation without overwriting existing ones
  const selectFiles = async (id) => {
    const selectedFiles = await window.electron.selectFiles();
    if (selectedFiles && Array.isArray(selectedFiles)) {
      setOperations((prev) =>
        prev.map((op) => {
          if (op.id !== id) return op;

          const existingPaths = new Set(op.files.map((f) => f.originalPath));

          const newFiles = selectedFiles
            .filter((filePath) => !existingPaths.has(filePath))
            .map((filePath) => {
              const extension = filePath.split(".").pop().toLowerCase();
              const nameWithoutExt = filePath
                .split("/")
                .pop()
                .replace(/\.[^/.]+$/, "");
              return {
                originalPath: filePath,
                originalName: filePath.split("/").pop(),
                extension,
                nameWithoutExt,
              };
            });

          const newNames = { ...op.newNames };
          newFiles.forEach((file) => {
            newNames[
              file.originalPath
            ] = `${file.nameWithoutExt}.${file.extension}`;
          });

          return {
            ...op,
            files: [...op.files, ...newFiles],
            newNames,
            previewVisibility: { ...op.previewVisibility },
          };
        })
      );
    }
  };

  // select destination folder for the operation
  const selectFolder = async (id) => {
    const selectedFolder = await window.electron.selectFolder();
    setOperations((prev) =>
      prev.map((op) =>
        op.id === id ? { ...op, destination: selectedFolder || "" } : op
      )
    );
  };

  // change the target new name for a file
  const handleNewNameChange = (opId, filePath, newName) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.id === opId
          ? {
              ...op,
              newNames: {
                ...op.newNames,
                [filePath]: `${newName.replace(/\.[^/.]+$/, "")}.${
                  op.files.find((f) => f.originalPath === filePath)
                    ?.extension || ""
                }`,
              },
            }
          : op
      )
    );
  };

  // show preview box for a file
  const togglePreview = (opId, filePath) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.id === opId
          ? {
              ...op,
              previewVisibility: {
                ...op.previewVisibility,
                [filePath]: true,
              },
            }
          : op
      )
    );
  };

  // close preview box for a file
  const closePreview = (opId, filePath) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.id === opId
          ? {
              ...op,
              previewVisibility: {
                ...op.previewVisibility,
                [filePath]: false,
              },
            }
          : op
      )
    );
  };

  // remove individual file from an operation
  const removeFile = (opId, filePath) => {
    setOperations((prev) =>
      prev
        .map((op) => {
          if (op.id !== opId) return op;
          const updatedFiles = op.files.filter(
            (f) => f.originalPath !== filePath
          );
          const updatedNewNames = { ...op.newNames };
          delete updatedNewNames[filePath];
          const updatedPreviewVisibility = { ...op.previewVisibility };
          delete updatedPreviewVisibility[filePath];
          return {
            ...op,
            files: updatedFiles,
            newNames: updatedNewNames,
            previewVisibility: updatedPreviewVisibility,
          };
        })
        .filter((op) => op.files.length > 0)
    );
  };

  // move all files according to their rename/destination settings
  const applyAllOperations = async () => {
    for (const op of operations) {
      if (!op.files.length || !op.destination) continue;

      const targetFolder = op.subfolder
        ? `${op.destination}/${op.subfolder}`
        : op.destination;

      await window.electron.ensureFolder(targetFolder);

      for (const file of op.files) {
        const newName = op.newNames[file.originalPath] || file.originalName;
        const newPath = `${targetFolder}/${newName}`;
        await window.electron.renameMoveFile(file.originalPath, newPath);
      }
    }

    alert("All files processed.");
    setOperations([]);
  };

  // UI
  return (
    <div style={appStyle}>
      {/* top header and add operation button */}
      <h2>Batch File Mover</h2>
      <button onClick={addOperation} style={buttonStyle}>
        ➕ Add New Operation
      </button>

      {/* render each operation box */}
      {operations.map((op) => (
        <div key={op.id} style={operationBoxStyle}>
          {/* operation header with controls */}
          <div style={accordionHeaderStyle}>
            <h3>Operation {operations.indexOf(op) + 1}</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => toggleOperation(op.id)}
                style={buttonStyle}
              >
                {op.expanded ? "⬆️" : "⬇️"}
              </button>
              <button
                onClick={() => removeOperation(op.id)}
                style={deleteButtonStyle}
              >
                X
              </button>
            </div>
          </div>

          {/* operation body with file controls */}
          {op.expanded && (
            <div>
              {/* file/folder pickers */}
              <button onClick={() => selectFiles(op.id)} style={buttonStyle}>
                Select Files
              </button>
              <button onClick={() => selectFolder(op.id)} style={buttonStyle}>
                Select Destination
              </button>

              <p>Destination: {op.destination || "No folder selected"}</p>

              {/* subfolder input */}
              <input
                type="text"
                placeholder="Subfolder name (optional)"
                value={op.subfolder || ""}
                onChange={(e) =>
                  setOperations((prev) =>
                    prev.map((o) =>
                      o.id === op.id ? { ...o, subfolder: e.target.value } : o
                    )
                  )
                }
                style={inputStyle}
              />

              {/* file table */}
              {op.files.length > 0 && (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Previous Filename</th>
                      <th style={tableHeaderStyle}>Final Name</th>
                      <th style={tableHeaderStyle}>Preview</th>
                      <th style={tableHeaderStyle}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.files.map((file) => (
                      <tr key={file.originalPath} style={tableRowStyle}>
                        {/* original filename */}
                        <td style={tableCellStyle}>{file.originalName}</td>

                        {/* editable new filename */}
                        <td style={tableCellStyle}>
                          <input
                            type="text"
                            value={op.newNames[file.originalPath] || ""}
                            onChange={(e) =>
                              handleNewNameChange(
                                op.id,
                                file.originalPath,
                                e.target.value
                              )
                            }
                            style={inputStyle}
                          />
                        </td>

                        {/* preview and preview box */}
                        <td style={tableCellStyle}>
                          {!op.previewVisibility[file.originalPath] && (
                            <button
                              onClick={() =>
                                togglePreview(op.id, file.originalPath)
                              }
                              style={buttonStyle}
                            >
                              Preview
                            </button>
                          )}
                          {op.previewVisibility[file.originalPath] && (
                            <div style={previewContainerStyle}>
                              <div style={previewBoxStyle}>
                                <button
                                  onClick={() =>
                                    closePreview(op.id, file.originalPath)
                                  }
                                  style={closePreviewButtonStyle}
                                >
                                  X
                                </button>
                                {file.extension === "stl" ? (
                                  <STLPreview filePath={file.originalPath} />
                                ) : imageExtensions.includes(file.extension) ? (
                                  <img
                                    src={`safe-file://${encodeURI(
                                      file.originalPath
                                    )}`}
                                    alt="preview"
                                    style={previewImageStyle}
                                  />
                                ) : (
                                  <p style={{ color: "#ccc" }}>
                                    Preview not supported
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* remove file button */}
                        <td style={tableCellStyle}>
                          <button
                            onClick={() => removeFile(op.id, file.originalPath)}
                            style={deleteButtonStyle}
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}

      {/* apply all button at the very bottom */}
      {operations.length > 0 && (
        <button onClick={applyAllOperations} style={applyAllButtonStyle}>
          ✅ Apply All Rename/Move Operations
        </button>
      )}
    </div>
  );
}

export default App;

// styles
const appStyle = {
  padding: "20px",
  backgroundColor: "#222",
  minHeight: "100vh",
  color: "#fff",
};
const buttonStyle = {
  background: "#007bff",
  color: "white",
  padding: "8px",
  margin: "5px",
  borderRadius: "5px",
  cursor: "pointer",
};
const deleteButtonStyle = {
  background: "red",
  color: "white",
  padding: "5px",
  borderRadius: "5px",
  cursor: "pointer",
};
const inputStyle = {
  padding: "5px",
  borderRadius: "5px",
  backgroundColor: "#222",
  color: "#fff",
  fontSize: "16px",
  border: "1px solid #555",
  width: "100%",
};
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: "#444",
  color: "#fff",
};
const tableHeaderStyle = {
  backgroundColor: "#555",
  padding: "10px",
  textAlign: "left",
};
const tableCellStyle = { padding: "10px", borderBottom: "1px solid #777" };
const tableRowStyle = {
  backgroundColor: "#222",
  borderBottom: "1px solid #555",
};
const operationBoxStyle = {
  backgroundColor: "#333",
  padding: "15px",
  borderRadius: "8px",
  marginBottom: "20px",
};
const accordionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#444",
  padding: "10px",
  borderRadius: "8px",
};
const applyAllButtonStyle = {
  background: "green",
  color: "white",
  padding: "10px",
  marginTop: "20px",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "16px",
};
const previewContainerStyle = {
  position: "relative",
  display: "inline-block",
  marginTop: "10px",
};
const previewBoxStyle = {
  border: "2px solid #888",
  borderRadius: "8px",
  padding: "10px",
  position: "relative",
  display: "inline-block",
  backgroundColor: "#111",
};
const closePreviewButtonStyle = {
  position: "absolute",
  top: "8px",
  right: "8px",
  background: "red",
  color: "white",
  padding: "4px 8px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
  zIndex: 10,
};
const previewImageStyle = {
  width: "400px",
  height: "400px",
  objectFit: "cover",
  borderRadius: "8px",
  border: "1px solid #555",
};
