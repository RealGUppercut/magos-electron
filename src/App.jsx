import { useState } from "react";

function App() {
  const [operations, setOperations] = useState([]);

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];

  const addOperation = () => {
    setOperations((prev) => [
      ...prev,
      {
        id: Date.now(),
        files: [],
        newNames: {},
        destination: "",
        previewVisibility: {},
        expanded: true,
      },
    ]);
  };

  const toggleOperation = (id) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, expanded: !op.expanded } : op))
    );
  };

  const removeOperation = (id) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  };

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
                newNames: selectedFiles.reduce((acc, filePath, index) => {
                  const extension = filePath.split(".").pop().toLowerCase();
                  const nameWithoutExt = filePath
                    .split("/")
                    .pop()
                    .replace(/\.[^/.]+$/, "");
                  acc[index] = `${nameWithoutExt}.${extension}`;
                  return acc;
                }, {}),
                previewVisibility: {},
              }
            : op
        )
      );
    }
  };

  const selectFolder = async (id) => {
    const selectedFolder = await window.electron.selectFolder();
    setOperations((prev) =>
      prev.map((op) =>
        op.id === id ? { ...op, destination: selectedFolder || "" } : op
      )
    );
  };

  const handleNewNameChange = (opId, index, newName) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.id === opId
          ? {
              ...op,
              newNames: {
                ...op.newNames,
                [index]: `${newName.replace(/\.[^/.]+$/, "")}.${
                  op.files[index].extension
                }`,
              },
            }
          : op
      )
    );
  };

  const handleNameClick = (e, op, index) => {
    e.target.setSelectionRange(0, op.files[index].nameWithoutExt.length);
  };

  const togglePreview = (opId, index) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.id === opId
          ? {
              ...op,
              previewVisibility: {
                ...op.previewVisibility,
                [index]: true,
              },
            }
          : op
      )
    );
  };

  const closePreview = (opId, index) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.id === opId
          ? {
              ...op,
              previewVisibility: {
                ...op.previewVisibility,
                [index]: false,
              },
            }
          : op
      )
    );
  };

  const removeFile = (opId, index) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.id === opId
          ? {
              ...op,
              files: op.files.filter((_, i) => i !== index),
              newNames: Object.fromEntries(
                Object.entries(op.newNames).filter(
                  ([key]) => key !== index.toString()
                )
              ),
              previewVisibility: Object.fromEntries(
                Object.entries(op.previewVisibility).filter(
                  ([key]) => key !== index.toString()
                )
              ),
            }
          : op
      )
    );
  };

  const applyAllOperations = async () => {
    const allResults = await Promise.all(
      operations.map(async (op) => {
        if (!op.files.length || !op.destination)
          return { success: false, error: "Missing data" };

        const renameTasks = op.files.map(async (file, index) => {
          const newName = op.newNames[index];
          const newPath = `${op.destination}/${newName}`;
          return await window.electron.renameMoveFile(
            file.originalPath,
            newPath
          );
        });

        return await Promise.all(renameTasks);
      })
    );

    if (allResults.flat().every((res) => res.success)) {
      alert("All files moved successfully!");
      setOperations([]);
    } else {
      alert("Some files failed to move.");
    }
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
                    {op.files.map((file, index) => (
                      <tr key={index} style={tableRowStyle}>
                        <td style={tableCellStyle}>{file.originalName}</td>
                        <td style={tableCellStyle}>
                          <input
                            type="text"
                            value={op.newNames[index] || ""}
                            onChange={(e) =>
                              handleNewNameChange(op.id, index, e.target.value)
                            }
                            onClick={(e) => handleNameClick(e, op, index)}
                            style={inputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          {imageExtensions.includes(file.extension) &&
                            (!op.previewVisibility[index] ? (
                              <button
                                onClick={() => togglePreview(op.id, index)}
                                style={buttonStyle}
                              >
                                Show Preview
                              </button>
                            ) : (
                              <div style={previewContainerStyle}>
                                <button
                                  onClick={() => closePreview(op.id, index)}
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
                            onClick={() => removeFile(op.id, index)}
                            style={deleteButtonStyle}
                          >
                            X
                          </button>{" "}
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

      {operations.length > 0 && (
        <button onClick={applyAllOperations} style={applyAllButtonStyle}>
          ✅ Apply All Rename/Move Operations
        </button>
      )}
    </div>
  );
}

export default App;

/* ✅ ALL STYLES CHECKED AND DEFINED */
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
const applyAllButtonStyle = {
  ...buttonStyle,
  background: "green",
  marginTop: "20px",
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
  width: "100%", // Adjust width dynamically if needed
};
const previewImageStyle = {
  width: "400px",
  height: "400px",
  objectFit: "cover",
  marginTop: "10px",
  borderRadius: "8px",
  border: "1px solid #555",
};
const previewContainerStyle = { position: "relative", display: "inline-block" };

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
