import { useState } from "react";

function App() {
  const [operations, setOperations] = useState([]);

  // list of supported image extensions for previews
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];

  // adds a new operation for file renaming/moving
  const addOperation = () => {
    setOperations((prev) => [
      ...prev,
      {
        id: Date.now(), // unique id for each operation
        files: [], // holds selected files
        newNames: {}, // stores updated filenames
        destination: "", // folder where files will be moved
        previewVisibility: {}, // image preview toggling
        expanded: true, // whether the operation window is open or collapsed
      },
    ]);
  };

  // toggles the expanded/collapsed state of an operation window
  const toggleOperation = (id) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, expanded: !op.expanded } : op))
    );
  };

  // removes an entire operation window
  const removeOperation = (id) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  };

  // lets the user select files and updates state
  const selectFiles = async (id) => {
    const selectedFiles = await window.electron.selectFiles();
    if (selectedFiles && Array.isArray(selectedFiles)) {
      setOperations((prev) =>
        prev.map((op) =>
          op.id === id
            ? {
                ...op,
                files: selectedFiles.map((filePath) => {
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
                }),
                // prefills new names to match the original names
                newNames: selectedFiles.reduce((acc, filePath) => {
                  const extension = filePath.split(".").pop().toLowerCase();
                  const nameWithoutExt = filePath
                    .split("/")
                    .pop()
                    .replace(/\.[^/.]+$/, "");
                  acc[filePath] = `${nameWithoutExt}.${extension}`;
                  return acc;
                }, {}),
                previewVisibility: {},
              }
            : op
        )
      );
    }
  };

  // select a destination folder
  const selectFolder = async (id) => {
    const selectedFolder = await window.electron.selectFolder();
    setOperations((prev) =>
      prev.map((op) =>
        op.id === id ? { ...op, destination: selectedFolder || "" } : op
      )
    );
  };

  // updates the new filename when edited
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

  // highlights just the name in the filename input field when clicked
  const handleNameClick = (e, file) => {
    e.target.setSelectionRange(0, file.nameWithoutExt.length);
  };

  // toggles image preview on
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

  // toggles image preview off
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

  // removes a single file from an operation window
  const removeFile = (opId, filePath) => {
    setOperations(
      (prev) =>
        prev
          .map((op) => {
            if (op.id !== opId) return op;

            // remove the file from the files list
            const updatedFiles = op.files.filter(
              (file) => file.originalPath !== filePath
            );

            // remove the corresponding new name
            const updatedNewNames = { ...op.newNames };
            delete updatedNewNames[filePath];

            // remove the corresponding preview state
            const updatedPreviewVisibility = { ...op.previewVisibility };
            delete updatedPreviewVisibility[filePath];

            return {
              ...op,
              files: updatedFiles,
              newNames: updatedNewNames,
              previewVisibility: updatedPreviewVisibility,
            };
          })
          .filter((op) => op.files.length > 0) // remove the operation if no files are left
    );
  };

  return (
    <div style={appStyle}>
      <h2>Batch File Mover</h2>
      <button onClick={addOperation} style={buttonStyle}>
        ➕ Add New Operation
      </button>

      {operations.map((op) => (
        <div key={op.id} style={operationBoxStyle}>
          <div style={accordionHeaderStyle}>
            <h3 style={{ margin: 0 }}>
              Operation {operations.indexOf(op) + 1}
            </h3>
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

          {op.expanded && (
            <div>
              <button onClick={() => selectFiles(op.id)} style={buttonStyle}>
                Select Files
              </button>
              <button onClick={() => selectFolder(op.id)} style={buttonStyle}>
                Select Destination
              </button>

              <p>Destination: {op.destination || "No folder selected"}</p>

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
                        <td style={tableCellStyle}>{file.originalName}</td>
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
                            onClick={(e) => handleNameClick(e, file)}
                            style={inputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          {imageExtensions.includes(file.extension) &&
                            (!op.previewVisibility[file.originalPath] ? (
                              <button
                                onClick={() =>
                                  togglePreview(op.id, file.originalPath)
                                }
                                style={buttonStyle}
                              >
                                Show Preview
                              </button>
                            ) : (
                              <div style={previewContainerStyle}>
                                <button
                                  onClick={() =>
                                    closePreview(op.id, file.originalPath)
                                  }
                                  style={closePreviewButtonStyle}
                                >
                                  X
                                </button>
                                <img
                                  src={`safe-file://${file.originalPath}`}
                                  alt="Preview"
                                  style={previewImageStyle}
                                />
                              </div>
                            ))}
                        </td>
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
    </div>
  );
}

export default App;

// bunch of hacky styling
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
const deleteButtonStyle = {
  background: "red",
  color: "white",
  padding: "5px",
  borderRadius: "5px",
  cursor: "pointer",
};
const accordionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#444",
  padding: "10px",
  borderRadius: "8px",
};
const operationBoxStyle = {
  backgroundColor: "#333",
  padding: "15px",
  borderRadius: "8px",
  marginBottom: "20px",
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

const previewContainerStyle = {
  position: "relative",
  display: "inline-block",
};

const closePreviewButtonStyle = {
  position: "absolute",
  top: "15px",
  right: "5px",
  background: "red",
  color: "white",
  padding: "5px",
  borderRadius: "5px",
  cursor: "pointer",
};
const previewImageStyle = {
  width: "400px",
  height: "400px",
  objectFit: "cover",
  marginTop: "10px",
  borderRadius: "8px",
  border: "1px solid #555",
};
