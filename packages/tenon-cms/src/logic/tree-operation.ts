import { reactive, toRaw } from "vue";
import { getTreeModel } from "../local-db";
import { IMaterialConfig } from "../store/modules/materials";
import { ComponentTreeNode } from "../store/modules/viewer";
import { config2tree, tree2config } from "./config-transform";
const treeModel = getTreeModel();
import { useStore } from "../store";
import { createPropsBySchemas } from "./schema";

export const insertChild = (parent, child, relative, insertFromFront = false) => {
  if (!relative) {
    return insertFromFront ? parent.children.unshift(child) : parent.children.push(child);
  } else {
    const index = parent.children.indexOf(relative);
    if (index === -1) {
      return insertFromFront ? parent.children.unshift(child) : parent.children.push(child);
    }
    if (index === 0 && insertFromFront) {
      return parent.children.unshift(child);
    } else {
      return parent.children.splice(insertFromFront ? index : index + 1, 0, child);
    }
  }
}

export const extractChild = (parent, child) => {
  const index = parent.children.indexOf(child);
  if (index === -1) {
    return;
  }
  parent.children.splice(index, 1);
}

export const isAncestor = (parent, child) => {
  if (!child) return false;
  if (parent === child) {
    return true;
  }
  if (child.parent === undefined) {
    return false;
  }
  return isAncestor(parent, child.parent);
}

export function insertNewComponent(beInsert, parent, relative, insertFromFront = false, options: any = {}) {

  debugger;
  const expressedComponent = createTenonEditorComponentByMaterial(beInsert, parent, options);

  if (options.isSlot) {
    parent[relative] = expressedComponent;
    return expressedComponent;
  }
  insertChild(parent, expressedComponent, relative, insertFromFront);
  return expressedComponent;
}

export const recursiveInsertNewComponent = (comp, parent, relative, insertFromFront = false, isSlot = false) => {
  const store = useStore();
  const beInsert = store.getters['materials/getMaterialsMap'].get(comp.name)();
  const expressedComponent = insertNewComponent(beInsert, parent, relative, insertFromFront, {
    props: comp.props,
    slots: comp.slots,
    isSlot: isSlot,
  });
  if (comp.children) {
    comp.children.forEach((child) => {
      recursiveInsertNewComponent(child, expressedComponent, relative, insertFromFront);
    });
  }
  if (comp.slots) {
    Object.keys(comp.slots).forEach(slotKey => {
      recursiveInsertNewComponent(comp.slots[slotKey], expressedComponent.slots, slotKey, false, true)
    })
  }
  return expressedComponent;
}


export const createTenonEditorComponentByMaterial = (material: IMaterialConfig, sup: ComponentTreeNode | null = null, options: any = {}): ComponentTreeNode => {
  const {
    props,
    slots,
    isSlot,
  } = options;
  const store = useStore();
  store.dispatch('viewer/setCompId');
  const id = store.getters['viewer/getCompId'];

  const expressedComponent: any = reactive<ComponentTreeNode>({
    name: material.name,
    parent: isSlot ? null : sup,
    material,
    props: createPropsBySchemas(material.schemas!, isSlot ? null : props),
    id,
    textID: String(id),
    slots: {},
  });

  if (material.config.nestable) {
    expressedComponent.children = material.children || [];
  }

  material.tenonComp = expressedComponent;
  return expressedComponent;
}

export const uploadTree = (tree: ComponentTreeNode) => {
  const store = useStore();
  const config = toRaw<ComponentTreeNode>(tree2config(tree));

  return treeModel.set({
    config,
    lastID: store.getters['viewer/getCompId'],
  });
}

export const downloadTree = async (): Promise<ComponentTreeNode> => {
  const store = useStore();
  const tree = await treeModel.get() as any;
  if (!tree) return tree;
  const {
    lastID,
    config,
  } = tree;
  store.dispatch('viewer/setCompId', lastID);
  config2tree(config);
  store.dispatch('viewer/setTree', config);
  store.dispatch('viewer/setActiveComponent', null);
  return config;
}
