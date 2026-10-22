/* Versioned internal procedural-graph documents. */
(function registerRadenGraphs(global) {
  const GRAPH_STATE_VERSION = 1;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function createGraphFromStageDescription(description, options) {
    const opts = options || {};
    const modeId = String(description?.modeId || "").trim();
    const stages = Array.isArray(description?.stages) ? description.stages : [];
    if (!modeId || !stages.length) {
      throw new TypeError("Graph creation requires a populated stage description.");
    }
    const disabled = new Set(opts.disabledStageIds || []);
    const controlState = opts.controlState || {};
    const outputOwners = new Map();
    const connections = [];
    const nodes = stages.map((stage) => {
      const parameters = {};
      (stage.controlIds || []).forEach((controlId) => {
        if (Object.prototype.hasOwnProperty.call(controlState, controlId)) {
          parameters[controlId] = clone(controlState[controlId]);
        }
      });
      (stage.inputs || []).forEach((port) => {
        const owner = outputOwners.get(port);
        if (owner) {
          connections.push({
            from: { nodeId: owner, port },
            to: { nodeId: stage.id, port },
          });
        }
      });
      (stage.outputs || []).forEach((port) => outputOwners.set(port, stage.id));
      return {
        id: stage.id,
        type: `${modeId}.${stage.id}`,
        kind: stage.kind,
        interfaceId: stage.interfaceId || null,
        interfaceBindings: clone(stage.interfaceBindings || {}),
        optional: stage.optional === true,
        enabled: !disabled.has(stage.id),
        inputs: Array.from(stage.inputs || []),
        outputs: Array.from(stage.outputs || []),
        controlIds: Array.from(stage.controlIds || []),
        parameters,
      };
    });
    const finalNode = nodes[nodes.length - 1];
    const graph = {
      version: GRAPH_STATE_VERSION,
      id: opts.id || `${modeId}:default`,
      modeId,
      externalInputs: Array.from(description.externalInputs || []),
      nodes,
      connections,
      output: {
        nodeId: finalNode.id,
        port: finalNode.outputs[finalNode.outputs.length - 1],
      },
    };
    assertValidGraph(graph);
    return graph;
  }

  function validateGraph(graph) {
    const issues = [];
    if (!graph || typeof graph !== "object") return ["Graph must be an object."];
    if (graph.version !== GRAPH_STATE_VERSION) {
      issues.push(`Unsupported graph version: ${graph.version}.`);
    }
    if (!String(graph.modeId || "").trim()) issues.push("Graph requires modeId.");
    if (!Array.isArray(graph.nodes) || !graph.nodes.length) {
      issues.push("Graph requires nodes.");
      return issues;
    }
    const nodes = new Map();
    const nodeOrder = new Map();
    graph.nodes.forEach((node) => {
      if (!node?.id) {
        issues.push("Graph node requires id.");
        return;
      }
      if (nodes.has(node.id)) issues.push(`Duplicate graph node id: ${node.id}.`);
      nodes.set(node.id, node);
      nodeOrder.set(node.id, nodeOrder.size);
      if (node.type !== `${graph.modeId}.${node.id}`) {
        issues.push(`Graph node ${node.id} has incompatible type: ${node.type}.`);
      }
      if (!node.optional && node.enabled === false) {
        issues.push(`Required graph node cannot be disabled: ${node.id}.`);
      }
      if (!Array.isArray(node.inputs) || !Array.isArray(node.outputs)) {
        issues.push(`Graph node ${node.id} requires input and output ports.`);
      }
      const stageInterface = node.interfaceId
        ? global.RadenStages?.getInterface?.(node.interfaceId)
        : null;
      if (node.interfaceId && !stageInterface) {
        issues.push(`Graph node ${node.id} has unknown interface: ${node.interfaceId}.`);
      }
      Object.entries(node.interfaceBindings || {}).forEach(([role, port]) => {
        const binding = stageInterface?.bindings?.[role];
        if (stageInterface && !binding) {
          issues.push(`Graph node ${node.id} has unknown ${node.interfaceId} binding: ${role}.`);
          return;
        }
        const ports = binding?.direction === "input"
          ? node.inputs || []
          : binding?.direction === "output"
            ? node.outputs || []
            : [...(node.inputs || []), ...(node.outputs || [])];
        if (!ports.includes(port)) {
          issues.push(`Graph node ${node.id} has invalid ${role} binding: ${port}.`);
        }
      });
    });
    const connectedInputs = new Set();
    (graph.connections || []).forEach((connection, index) => {
      const source = nodes.get(connection?.from?.nodeId);
      const target = nodes.get(connection?.to?.nodeId);
      if (!source) issues.push(`Connection ${index} has unknown source node.`);
      if (!target) issues.push(`Connection ${index} has unknown target node.`);
      if (source && !source.outputs.includes(connection.from.port)) {
        issues.push(`Connection ${index} has unknown source port: ${connection.from.port}.`);
      }
      if (target && !target.inputs.includes(connection.to.port)) {
        issues.push(`Connection ${index} has unknown target port: ${connection.to.port}.`);
      }
      if (source && target && nodeOrder.get(source.id) >= nodeOrder.get(target.id)) {
        issues.push(`Connection ${index} must point forward.`);
      }
      const inputKey = `${connection?.to?.nodeId}.${connection?.to?.port}`;
      if (connectedInputs.has(inputKey)) {
        issues.push(`Graph input has multiple connections: ${inputKey}.`);
      }
      connectedInputs.add(inputKey);
    });
    const externalInputs = new Set(graph.externalInputs || []);
    graph.nodes.forEach((node) => {
      (node.inputs || []).forEach((port) => {
        if (!externalInputs.has(port) && !connectedInputs.has(`${node.id}.${port}`)) {
          issues.push(`Graph input is unconnected: ${node.id}.${port}.`);
        }
      });
    });
    const outputNode = nodes.get(graph.output?.nodeId);
    if (!outputNode) issues.push("Graph output references an unknown node.");
    else if (!outputNode.outputs.includes(graph.output?.port)) {
      issues.push(`Graph output references an unknown port: ${graph.output?.port}.`);
    }
    return issues;
  }

  function assertValidGraph(graph) {
    const issues = validateGraph(graph);
    if (issues.length) throw new TypeError(issues.join(" "));
    return graph;
  }

  function serializeGraph(graph) {
    assertValidGraph(graph);
    return JSON.stringify(graph);
  }

  function deserializeGraph(serialized) {
    let graph;
    try {
      graph = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
    } catch (_error) {
      throw new TypeError("Graph payload is not valid JSON.");
    }
    assertValidGraph(graph);
    return graph;
  }

  function getDisabledStageIds(graph) {
    assertValidGraph(graph);
    return graph.nodes
      .filter((node) => node.optional && node.enabled === false)
      .map((node) => node.id);
  }

  function setNodeEnabled(graph, nodeId, enabled) {
    assertValidGraph(graph);
    const nextGraph = clone(graph);
    const node = nextGraph.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) throw new TypeError(`Unknown graph node: ${nodeId}.`);
    if (!node.optional && enabled === false) {
      throw new TypeError(`Required graph node cannot be disabled: ${nodeId}.`);
    }
    node.enabled = enabled !== false;
    assertValidGraph(nextGraph);
    return nextGraph;
  }

  global.RadenGraphs = Object.assign({}, global.RadenGraphs || {}, {
    GRAPH_STATE_VERSION,
    createGraphFromStageDescription,
    validateGraph,
    assertValidGraph,
    serializeGraph,
    deserializeGraph,
    getDisabledStageIds,
    setNodeEnabled,
  });
})(window);
