// Import React and other libraries
import React, { useState } from "react";
import dommy from "dommy";
import commands from "frontend/commands";
import editor from "frontend/components/editor";
import pageMenu from "frontend/components/page-menu";
import exportComponent from "frontend/components/export";
import i18n from "frontend/context/i18n";
import db from "frontend/db";
import srs from "frontend/extensions/srs";
import commonHandler from "frontend/handler/common";
import editorHandler from "frontend/handler/editor";
import imageHandler from "frontend/handler/image";
import notification from "frontend/handler/notification";
import pageHandler from "frontend/handler/page";
import devCommonHandler from "frontend/handler/common/developer";
import mixins from "frontend/mixins";
import state from "frontend/state";
import ui from "frontend/ui";
import util from "frontend/util";
import shortcut from "frontend/modules/shortcut/core";
import gpUtil from "logseq/graph-parser/util";
import blockRef from "logseq/graph-parser/util/block-ref";
import urlUtil from "frontend/util/url";

// Define custom context menu content component
function CustomContextMenuContent() {
  // Use state hook to store menu state
  const [menuState, setMenuState] = useState({
    backgroundColor: null,
    heading: null,
    selectionBlockIds: [],
  });

  // Use effect hook to update menu state when selection changes
  React.useEffect(() => {
    const selectionBlockIds = state.getSelectionBlockIds();
    if (selectionBlockIds.length > 0) {
      const firstBlock = db.entity(["block/uuid", selectionBlockIds[0]]);
      const backgroundColor = firstBlock.block.properties.backgroundColor;
      const heading = firstBlock.block.properties.heading || false;
      setMenuState({ backgroundColor, heading, selectionBlockIds });
    }
  }, [state.selection]);

  // Define menu link handlers
  const handleCut = () => {
    editorHandler.cutSelectionBlocks(true);
  };

  const handleDelete = () => {
    editorHandler.deleteSelection();
    state.hideCustomContextMenu();
  };

  const handleCopy = () => {
    editorHandler.copySelectionBlocks();
  };

  const handleCopyAs = () => {
    const blockUuids = editorHandler.getSelectedToplevelBlockUuids();
    state.setModal(() => exportComponent.exportBlocks(blockUuids, { whiteboard: false }));
  };

  const handleCopyBlockRefs = () => {
    editorHandler.copyBlockRefs();
  };

  const handleCopyBlockEmbeds = () => {
    editorHandler.copyBlockEmbeds();
  };

  const handleCycleTodos = () => {
    editorHandler.cycleTodos();
  };

  const handleExpandAll = () => {
    editorHandler.expandAllSelection();
  };

  const handleCollapseAll = () => {
    editorHandler.collapseAllSelection();
  };

  // Define menu link components
  const MenuLink = ({ key, onClick, label, shortcut }) => (
    <div key={key} className="menu-link" onClick={onClick}>
      <span>{i18n.t(label)}</span>
      {shortcut && <span className="shortcut">{shortcut}</span>}
    </div>
  );

  // Define menu background color component
  const MenuBackgroundColor = ({ onChange, onRemove }) => (
    <div className="menu-background-color">
      <span>{i18n.t("content/background-color")}</span>
      <div className="color-picker">
        {ui.colors.map((color) => (
          <div
            key={color}
            className="color"
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          ></div>
        ))}
        <div className="remove" onClick={onRemove}>
          x
        </div>
      </div>
    </div>
  );

  // Define menu heading component
  const MenuHeading = ({ value, onChange, onSetDefault, onRemove }) => (
    <div className="menu-heading">
      <span>{i18n.t("content/heading")}</span>
      <div className="heading-picker">
        {ui.headings.map((heading) => (
          <div
          key={heading}
          className={`heading h${heading}`}
          onClick={() => onChange(heading)}
        >
          {heading}
        </div>
      ))}
      <div className="default" onClick={onSetDefault}>
        {i18n.t("content/default")}
      </div>
      <div className="remove" onClick={onRemove}>
        x
      </div>
    </div>
  </div>
);

// Return the menu content component
return (
  <div className="menu-links-wrapper">
    <MenuBackgroundColor
      onChange={(color) =>
        editorHandler.batchAddBlockProperty(
          menuState.selectionBlockIds,
          "backgroundColor",
          color
        )
      }
      onRemove={() =>
        editorHandler.batchRemoveBlockProperty(
          menuState.selectionBlockIds,
          "backgroundColor"
        )
      }
    />

    <MenuHeading
      value={menuState.heading}
      onChange={(heading) =>
        editorHandler.batchSetHeading(menuState.selectionBlockIds, heading)
      }
      onSetDefault={() =>
        editorHandler.batchSetHeading(menuState.selectionBlockIds, true)
      }
      onRemove={() =>
        editorHandler.batchRemoveHeading(menuState.selectionBlockIds)
      }
    />

    <hr className="menu-separator" />

    <MenuLink
      key="cut"
      onClick={handleCut}
      label="editor/cut"
      shortcut={ui.keyboardShortcutFromConfig("editor/cut")}
    />
    <MenuLink
      key="delete"
      onClick={handleDelete}
      label="editor/delete-selection"
      shortcut={ui.keyboardShortcutFromConfig("editor/delete")}
    />
    <MenuLink
      key="copy"
      onClick={handleCopy}
      label="editor/copy"
      shortcut={ui.keyboardShortcutFromConfig("editor/copy")}
    />
    <MenuLink
      key="copy as"
      onClick={handleCopyAs}
      label="content/copy-export-as"
    />
    <MenuLink
      key="copy block refs"
      onClick={handleCopyBlockRefs}
      label="content/copy-block-ref"
    />
    <MenuLink
      key="copy block embeds"
      onClick={handleCopyBlockEmbeds}
      label="content/copy-block-emebed"
    />

    <hr className="menu-separator" />

    {state.enableFlashcards() && (
      <MenuLink
        key="Make a Card"
        onClick={() => srs.batchMakeCards()}
        label="context-menu/make-a-flashcard"
      />
    )}

    <MenuLink
      key="cycle todos"
      onClick={handleCycleTodos}
      label="editor/cycle-todo"
      shortcut={ui.keyboardShortcutFromConfig("editor/cycle-todo")}
    />

    <hr className="menu-separator" />

    <MenuLink
      key="Expand all"
      onClick={handleExpandAll}
      label="editor/expand-block-children"
      shortcut={ui.keyboardShortcutFromConfig("editor/expand-block-children")}
    />
    <MenuLink
      key="Collapse all"
      onClick={handleCollapseAll}
      label="editor/collapse-block-children"
      shortcut={ui.keyboardShortcutFromConfig("editor/collapse-block-children")}
    />
  </div>
);
}

// Define template checkbox component
function TemplateCheckbox({ templateIncludingParent, setTemplateIncludingParent }) {
return (
  <div className="flex flex-row w-auto items-center">
    <p className="text-medium mr-2">
      {i18n.t("context-menu/template-include-parent-block")}
    </p>
    {ui.toggle(templateIncludingParent, setTemplateIncludingParent)}
  </div>
);
}

// Define block template component
function BlockTemplate({ blockId }) {
// Use state hooks to store template state
const [edit, setEdit] = useState(false);
const [input, setInput] = useState("");
const [templateIncludingParent, setTemplateIncludingParent] = useState(null);

// Use effect hook to reset template state when unmounting
React.useEffect(() => {
  return () => {
    setTemplateIncludingParent(null);
  };
}, []);

// Get block from database
const block = db.entity(["block/uuid", blockId]);

// Check if block has children
const hasChildren = Boolean(block.block._parent.length);

// Set default value for template including parent state
if (templateIncludingParent === null && hasChildren) {
  setTemplateIncludingParent(true);
}

// Define template
  // Define template handlers
  const handleSubmit = () => {
    const title = input.trim();
    if (title) {
      if (pageHandler.templateExists(title)) {
        notification.show(
          <p>{i18n.t("context-menu/template-exists-warning")}</p>,
          "error"
        );
      } else {
        editorHandler.setBlockProperty(blockId, "template", title);
        if (templateIncludingParent === false) {
          editorHandler.setBlockProperty(
            blockId,
            "template-including-parent",
            false
          );
        }
        state.hideCustomContextMenu();
      }
    }
  };

  // Return the block template component
  if (edit) {
    state.clearEdit();
    return (
      <>
        <div
          className="px-4 py-2 text-sm"
          onClick={(e) => util.stop(e)}
        >
          <p>{i18n.t("context-menu/input-template-name")}</p>
          <input
            id="new-template"
            className="form-input block w-full sm:text-sm sm:leading-5 my-2"
            autoFocus
            onChange={(e) => setInput(util.evalue(e))}
          />
          {hasChildren && (
            <TemplateCheckbox
              templateIncludingParent={templateIncludingParent}
              setTemplateIncludingParent={setTemplateIncludingParent}
            />
          )}
          {ui.button(i18n.t("submit"), { onClick: handleSubmit })}
        </div>
        <hr className="menu-separator" />
      </>
    );
  } else {
    return ui.menuLink(
      {
        key: "Make a Template",
        onClick: (e) => {
          util.stop(e);
          setEdit(true);
        },
      },
      i18n.t("context-menu/make-a-template")
    );
  }
}

// Define block context menu content component
function BlockContextMenuContent({ target, blockId }) {
  // Get block from database
  const block = db.entity(["block/uuid", blockId]);

  // Get heading from block properties
  const heading = block.block.properties.heading || false;

  // Define menu link handlers
  const handleOpenInSidebar = () => {
    editorHandler.openBlockInSidebar(blockId);
  };

  const handleCopyBlockRef = () => {
    editorHandler.copyBlockRef(blockId, blockRef.toBlockRef);
  };

  const handleCopyBlockEmbed = () => {
    editorHandler.copyBlockRef(blockId, (id) =>
      util.format("{{embed ((%s))}}", id)
    );
  };

  const handleCopyBlockUrl = () => {
    const currentRepo = state.getCurrentRepo();
    const url = urlUtil.getLogseqGraphUuidUrl(null, currentRepo, blockId);
    editorHandler.copyBlockRef(blockId, () => url);
  };

  const handleCopyAs = () => {
    state.setModal(() =>
      exportComponent.exportBlocks([blockId], { whiteboard: false })
    );
  };

  const handleCut = () => {
    editorHandler.cutBlock(blockId);
  };

  const handleDelete = () => {
    editorHandler.deleteBlockAux(block, true);
  };

  // Define menu link components
  const MenuLink = ({ key, onClick, label, shortcut }) => (
    <div key={key} className="menu-link" onClick={onClick}>
      <span>{i18n.t(label)}</span>
      {shortcut && <span className="shortcut">{shortcut}</span>}
    </div>
  );

  // Define menu background color component
  const MenuBackgroundColor = ({ onChange, onRemove }) => (
    <div className="menu-background-color">
      <span>{i18n.t("content/background-color")}</span>
      <div className="color-picker">
        {ui.colors.map((color) => (
          <div
            key={color}
            className="color"
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          ></div>
        ))}
        <div className="remove" onClick={onRemove}>
          x
        </div>
      </div>
    </div>
  );

  // Define menu heading component
  const MenuHeading = ({ value, onChange, onSetDefault, onRemove }) => (
    <div className="menu-heading">
      <span>{i18n.t("content/heading")}</span>
      <div className="heading-picker">
        {ui.headings.map((heading) => (
          <div
            key={heading}
            className={`heading h${heading}`}
            onClick={() => onChange(heading)}
          >
            {heading}
          </div>
        ))}
        <div className="default" onClick={onSetDefault}>
          {i18n.t("content/default")}
        </div>
        <div className="remove" onClick={onRemove}>
          x
        </div>
      </div>
    </div>
  );

  // Return the block context menu content component
  return (
    <div className="menu-links-wrapper">
      <MenuBackgroundColor
        onChange={(color) =>
          editorHandler.setBlockProperty(blockId, "backgroundColor", color)
        }
        onRemove={() =>
          editorHandler.removeBlockProperty(blockId, "backgroundColor")
        }
      />

      <MenuHeading
        value={heading}
        onChange={(heading) =>
          editorHandler.setHeading(blockId, heading)
        }
        onSetDefault={() =>
          editorHandler.setHeading(blockId, true)
        }
        onRemove={() =>
          editorHandler.removeHeading(blockId)
        }
      />

      <hr className="menu-separator" />

      <MenuLink
        key="Open in sidebar"
        onClick={handleOpenInSidebar}
        label="content/open-in-sidebar"
        shortcut={["⇧", "click"]}
      />

      <hr className="menu-separator" />

      <MenuLink
        key="Copy block ref"
        onClick={handleCopyBlockRef}
        label="content/copy-block-ref"
      />

      <MenuLink
        key="Copy block embed"
        onClick={handleCopyBlockEmbed}
        label="content/copy-block-emebed"
      />

      {util.electron() && (
        <MenuLink
        key="Copy block URL"
        onClick={handleCopyBlockUrl}
        label="content/copy-block-url"
      />
    )}

    <MenuLink
      key="Copy as"
      onClick={handleCopyAs}
      label="content/copy-export-as"
    />

    <MenuLink
      key="Cut"
      onClick={handleCut}
      label="editor/cut"
      shortcut={ui.keyboardShortcutFromConfig("editor/cut")}
    />

    <MenuLink
      key="delete"
      onClick={handleDelete}
      label="editor/delete-selection"
      shortcut={ui.keyboardShortcutFromConfig("editor/delete")}
    />

    <hr className="menu-separator" />

    <BlockTemplate blockId={blockId} />

    {srs.cardBlock(block) && (
      <MenuLink
        key="Preview Card"
        onClick={() => srs.preview(block.db.id)}
        label="context-menu/preview-flashcard"
      />
    )}

    {state.enableFlashcards() && !srs.cardBlock(block) && (
      <MenuLink
        key="Make a Card"
        onClick={() => srs.makeBlockACard(blockId)}
        label="context-menu/make-a-flashcard"
      />
    )}

    <hr className="menu-separator" />

    <MenuLink
      key="Expand all"
      onClick={() => editorHandler.expandAll(blockId)}
      label="editor/expand-block-children"
      shortcut={ui.keyboardShortcutFromConfig("editor/expand-block-children")}
    />

    <MenuLink
      key="Collapse all"
      onClick={() => editorHandler.collapseAll(blockId, {})}
      label="editor/collapse-block-children"
      shortcut={ui.keyboardShortcutFromConfig("editor/collapse-block-children")}
    />

    {state.getPluginsCommandsWithType("block-context-menu-item").map(
      ([_, { key, label }, action, pid]) => (
        <MenuLink
          key={key}
          onClick={() =>
            commands.execPluginSimpleCommand(pid, { uuid: blockId }, action)
          }
          label={label}
        />
      )
    )}

    {state.getDeveloperMode() && (
        <>
        <MenuLink
          key="(Dev) Show block data"
          onClick={() =>
            devCommonHandler.showEntityData(["block/uuid", blockId])
          }
          label="dev/show-block-data"
        />

        <MenuLink
          key="(Dev) Show block AST"
          onClick={() => {
            const block = db.pull(["block/uuid", blockId]);
            devCommonHandler.showContentAst(
              block.block.content,
              block.block.format
            );
          }}
          label="dev/show-block-ast"
        />
      </>
    )}
  </div>
);
}

// Define hiccup content component
function HiccupContent({ id, hiccup }) {
return <div id={id}>{hiccup || <div className="cursor">Click to edit</div>}</div>;
}

// Define non-hiccup content component
function NonHiccupContent({
id,
content,
onClick,
onHide,
config,
format,
}) {
// Get edit state from state hook
const edit = state.getEditing(id);

// Render editor box if editing
if (edit) {
  return editor.box({ onHide, format }, id, config);
}

// Define click handler
const handleClick = (e) => {
  if (!util.link(e.target)) {
    util.stop(e);
    editorHandler.resetCursorRange(gdom.getElement(id));
    state.setEditContent(id, content);
    state.setEditInputId(id);
    if (onClick) {
      onClick(e);
    }
  }
};

// Render content or placeholder
return (
  <pre className="cursor content pre-white-space" id={id} onClick={handleClick}>
    {content ? (
      content
    ) : (
      <div className="cursor">Click to edit</div>
    )}
  </pre>
);
}

// Define set draw iframe style function
function setDrawIframeStyle() {
const width = window.innerWidth;
if (width >= 1024) {
  const draws = dommy.byClass("draw-iframe");
  const width = width - 200;
  for (const draw of draws) {
    dommy.setStyle(draw, "width", `${width}px`);
    const height = Math.max(700, width / 2);
    dommy.setStyle(draw, "height", `${height}px`);
    dommy.setStyle(draw, "margin-left", `${(width - 570) / 2}px`);
  }
}
}

// Define content component with effect hooks
function Content({
id,
format,
config,
hiccup,
content,
onClick,
onHide,
}) {
// Use effect hooks to update draw iframe style and render local images
React.useEffect(() => {
  setDrawIframeStyle();
  imageHandler.renderLocalImages();
  return () => {};
}, []);

// Render hiccup or non-hiccup content
if (hiccup) {
    return <HiccupContent id={id} hiccup={hiccup} />;
  } else {
    const format = gpUtil.normalizeFormat(format);
    return (
      <NonHiccupContent
        id={id}
        content={content}
        onClick={onClick}
        onHide={onHide}
        config={config}
        format={format}
      />
    );
  }
}

// Define block ref custom context menu content component
function BlockRefCustomContextMenuContent({ block, blockRefId }) {
  // Define menu link handlers
  const handleOpenInSidebar = () => {
    state.sidebarAddBlock(state.getCurrentRepo(), blockRefId, "block-ref");
  };

  const handleCopy = () => {
    editorHandler.copyCurrentRef(blockRefId);
  };

  const handleDelete = () => {
    editorHandler.deleteCurrentRef(block, blockRefId);
  };

  const handleReplaceWithText = () => {
    editorHandler.replaceRefWithText(block, blockRefId);
  };

  const handleReplaceWithEmbed = () => {
    editorHandler.replaceRefWithEmbed(block, blockRefId);
  };

  // Return the menu content component
  return (
    <div className="menu-links-wrapper">
      <MenuLink
        key="open-in-sidebar"
        onClick={handleOpenInSidebar}
        label="content/open-in-sidebar"
        shortcut={["⇧", "click"]}
      />
      <MenuLink
        key="copy"
        onClick={handleCopy}
        label="content/copy-ref"
      />
      <MenuLink
        key="delete"
        onClick={handleDelete}
        label="content/delete-ref"
      />
      <MenuLink
        key="replace-with-text"
        onClick={handleReplaceWithText}
        label="content/replace-with-text"
      />
      <MenuLink
        key="replace-with-embed"
        onClick={handleReplaceWithEmbed}
        label="content/replace-with-embed"
      />
    </div>
  );
}

// Define page title custom context menu content component
function PageTitleCustomContextMenuContent({ page }) {
  // Get page menu options from page menu component
  const pageMenuOptions = pageMenu.pageMenu(page);

  // Return the menu content component
  return (
    <div className="menu-links-wrapper">
      {pageMenuOptions.map(({ title, options }) => (
        <MenuLink key={title} options={options} label={title} />
      ))}
    </div>
  );
}

// Define event mixin for content component
function eventMixin(state) {
  // Listen to contextmenu event on window
  mixins.listen(state, window, "contextmenu", (e) => {
    const target = e.target;
    const blockId = dommy.attr(target, "blockid");
    const { block, blockRef } = state.getBlockRefContext();
    const { page } = state.getPageTitleContext();
    // Show custom context menu based on target
    if (page) {
      commonHandler.showCustomContextMenu(
        e,
        <PageTitleCustomContextMenuContent page={page} />
      );
      state.setState("page-title/context", null);
    } else if (blockRef) {
      commonHandler.showCustomContextMenu(
        e,
        <BlockRefCustomContextMenuContent block={block} blockRefId={blockRef} />
      );
      state.setState("block-ref/context", null);
    } else if (state.selection() && !dommy.hasClass(target, "bullet")) {
      commonHandler.showCustomContextMenu(
        e,
        <CustomContextMenuContent />
      );
    } else if (blockId && util.parseUuid(blockId)) {
      const block = target.closest(".ls-block");
      if (block) {
        state.clearSelection();
        state.conjSelectionBlock(block, "down");
      }
      commonHandler.showCustomContextMenu(
        e,
        <BlockContextMenuContent target={target} blockId={util.uuid(blockId)} />
      );
    }
  });
}

// Define content component with event mixin
function Content({ id, format, config, hiccup, content, onClick, onHide }) {
  // Use event mixin hook
  React.useEffect(() => {
    const state = {};
    eventMixin(state);
    return () => {};
  }, []);

  // Render hiccup or non-hiccup content
  if (hiccup) {
    return <HiccupContent id={id} hiccup={hiccup} />;
  } else {
    const format = gpUtil.normalizeFormat(format);
    return (
      <NonHiccupContent
        id={id}
        content={content}
        onClick={onClick}
        onHide={onHide}
        config={config}
        format={format}
      />
    );
  }
}
