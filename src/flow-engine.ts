import { Engine, type RuleProperties } from "json-rules-engine";

export interface Node {
  id: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  type: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  conditions: Record<string, unknown>;
}

// Execution context to track the flow state and results
export interface ExecutionContext {
  // Trace of all nodes executed and their results
  nodeExecutions: Array<{
    nodeId: string;
    nodeType: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    timestamp: Date;
  }>;

  // Trace of all edges traversed
  edgeTraversals: Array<{
    edgeId: string;
    sourceId: string;
    targetId: string;
    timestamp: Date;
  }>;

  // Keep track of the final result node
  finalNodeId: string | null;

  // Overall execution status
  status: "running" | "completed" | "failed";

  // Error information if the flow failed
  error?: Error;

  // Start and end times for performance tracking
  startTime: Date;
  endTime: Date | null;
}

export class FlowGraph {
  nodes = new Map<string, Node>();
  edges = new Map<string, Edge>();

  /**
   * Gets the start node of the flow
   * @returns The start node or null if not found
   */
  getStartNode(): Node | null {
    // Assuming the start node has a type of "start"
    for (const node of this.nodes.values()) {
      if (node.type === "start") {
        return node;
      }
    }
    return null;
  }

  /**
   * Adds a node to the graph
   * @param node The node to add
   */
  addNode(node: Node): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Adds an edge to the graph
   * @param edge The edge to add
   */
  addEdge(edge: Edge): void {
    this.edges.set(edge.id, edge);
  }

  /**
   * Gets outgoing edges from a node
   * @param nodeId The ID of the node
   * @returns Array of outgoing edges
   */
  getOutgoingEdges(nodeId: string): Edge[] {
    const outgoingEdges: Edge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.source === nodeId) {
        outgoingEdges.push(edge);
      }
    }
    return outgoingEdges;
  }

  /**
   * Gets the target node for an edge
   * @param edgeId The ID of the edge
   * @returns The target node or null if not found
   */
  getTargetNode(edgeId: string): Node | null {
    const edge = this.edges.get(edgeId);
    if (!edge) return null;

    return this.nodes.get(edge.target) || null;
  }

  /**
   * Gets a node by ID
   * @param nodeId The ID of the node
   * @returns The node or null if not found
   */
  getNode(nodeId: string): Node | null {
    return this.nodes.get(nodeId) || null;
  }
}

export class HandlerResolver {
  handlers = new Map<
    string,
    (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>
  >();

  /**
   * Registers a task handler for a specific task type
   * @param type The task type
   * @param handler The task handler function
   */
  registerHandler(
    type: string,
    handler: (
      inputs: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>,
  ): void {
    this.handlers.set(type, handler);
  }

  /**
   * Executes a task for a node
   * @param node The node to execute
   * @returns Promise with the task outputs
   * @throws Error if no handler is registered for the node type
   */
  async executeHandler(node: Node): Promise<Record<string, unknown>> {
    const handler = this.handlers.get(node.type);
    if (!handler) {
      throw new Error(`No task handler registered for node type: ${node.type}`);
    }

    return await handler(node.inputs);
  }
}

export class FlowMachine {
  graph = new FlowGraph();
  handlers = new HandlerResolver();
  context: ExecutionContext = this.createNewContext();

  /**
   * Creates a new execution context
   * @returns A fresh execution context
   */
  private createNewContext(): ExecutionContext {
    return {
      nodeExecutions: [],
      edgeTraversals: [],
      finalNodeId: null,
      status: "running",
      startTime: new Date(),
      endTime: null,
    };
  }

  /**
   * Runs the flow from start to finish
   * @returns Promise that resolves when the flow is complete
   */
  async run(): Promise<ExecutionContext> {
    // Reset the context for a new run
    this.context = this.createNewContext();

    try {
      const startNode = this.graph.getStartNode();
      if (!startNode) {
        throw new Error("No start node found in the flow graph");
      }

      await this.executeNode(startNode);

      // Mark flow as completed
      this.context.status = "completed";
      this.context.endTime = new Date();

      return this.context;
    } catch (error) {
      // Record the error and mark flow as failed
      this.context.status = "failed";
      this.context.error = error as Error;
      this.context.endTime = new Date();

      throw error;
    }
  }

  /**
   * Executes a node and follows the flow
   * @param node The node to execute
   */
  private async executeNode(node: Node): Promise<void> {
    const executionStart = new Date();
    let outputs: Record<string, unknown> = {};

    try {
      // For end nodes, copy inputs to outputs to preserve the final result
      if (node.type === "end") {
        // Copy all inputs to outputs for the end node
        for (const [key, value] of Object.entries(node.inputs)) {
          node.outputs[key] = value;
        }
      }
      // Execute regular nodes (not start nodes)
      else if (node.type !== "start") {
        outputs = await this.handlers.executeHandler(node);

        // Store outputs in the node
        for (const [key, value] of Object.entries(outputs)) {
          node.outputs[key] = value;
        }
      }

      // Record node execution in context
      this.context.nodeExecutions.push({
        nodeId: node.id,
        nodeType: node.type,
        inputs: { ...node.inputs },
        outputs: { ...node.outputs },
        timestamp: executionStart,
      });

      // If this is an end node, record it as the final node
      if (node.type === "end") {
        this.context.finalNodeId = node.id;
      }

      // Get outgoing edges
      const outgoingEdges = this.graph.getOutgoingEdges(node.id);

      // End the flow if there are no outgoing edges
      if (outgoingEdges.length === 0) {
        // If no outgoing edges and not already marked as final, mark this as the final node
        if (!this.context.finalNodeId) {
          this.context.finalNodeId = node.id;
        }
        return;
      }

      // Find the first edge whose conditions are satisfied
      for (const edge of outgoingEdges) {
        if (await this.evaluateConditions(edge.conditions, node.outputs)) {
          const nextNode = this.graph.getTargetNode(edge.id);
          if (nextNode) {
            // Record edge traversal
            this.context.edgeTraversals.push({
              edgeId: edge.id,
              sourceId: node.id,
              targetId: nextNode.id,
              timestamp: new Date(),
            });

            // Transfer relevant outputs to inputs of the next node
            this.transferOutputs(node, nextNode);
            await this.executeNode(nextNode);
          }
          break;
        }
      }
    } catch (error) {
      // Still record the node execution, but with the error
      this.context.nodeExecutions.push({
        nodeId: node.id,
        nodeType: node.type,
        inputs: { ...node.inputs },
        outputs: { ...node.outputs, error: (error as Error).message },
        timestamp: executionStart,
      });

      throw error;
    }
  }

  /**
   * Evaluates edge conditions against node outputs using json-rules-engine
   * @param conditions The conditions to evaluate
   * @param outputs The node outputs
   * @returns True if conditions are satisfied, false otherwise
   */
  private async evaluateConditions(
    conditions: Record<string, unknown>,
    outputs: Record<string, unknown>,
  ): Promise<boolean> {
    // If no conditions, always pass
    if (Object.keys(conditions).length === 0) {
      return true;
    }

    // Check if using the rules engine format (has 'all' or 'any' operators)
    if (conditions.all || conditions.any) {
      return await this.evaluateWithRulesEngine(conditions, outputs);
    }

    // Legacy implementation - simple key/value matching
    for (const [key, value] of Object.entries(conditions)) {
      if (outputs[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluates conditions using the json-rules-engine
   * @param conditions Object containing rule conditions
   * @param outputs Node outputs to evaluate against
   * @returns True if conditions are met, false otherwise
   */
  private async evaluateWithRulesEngine(
    conditions: Record<string, unknown>,
    outputs: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const engine = new Engine();

      // Create a rule with the conditions directly
      const rule = {
        conditions,
        event: { type: "condition-met" }, // Simple placeholder event
      } as RuleProperties;

      engine.addRule(rule);

      // Run the engine with the node outputs as facts
      const { events } = await engine.run(outputs);

      // If any events were triggered, the conditions are met
      return events.length > 0;
    } catch (error) {
      console.error("Error evaluating rules:", error);
      return false;
    }
  }

  /**
   * Transfers outputs from source node to inputs of target node
   * @param sourceNode The source node
   * @param targetNode The target node
   */
  private transferOutputs(sourceNode: Node, targetNode: Node): void {
    // Simple implementation - transfer all outputs to inputs
    // This could be expanded to support mapping specific outputs to inputs
    for (const [key, value] of Object.entries(sourceNode.outputs)) {
      targetNode.inputs[key] = value;
    }
  }

  /**
   * Load a flow definition into the machine
   * @param definition The flow definition
   */
  loadFlow(definition: { nodes: Node[]; edges: Edge[] }): void {
    // Clear existing graph
    this.graph = new FlowGraph();

    // Add nodes and edges
    for (const node of definition.nodes) {
      this.graph.addNode(node);
    }

    for (const edge of definition.edges) {
      this.graph.addEdge(edge);
    }
  }

  /**
   * Get the final result of the flow execution
   * @returns The outputs of the final node or null if not available
   */
  getResult(): Record<string, unknown> | null {
    if (!this.context.finalNodeId) {
      return null;
    }

    // Get the final node
    const finalNode = this.graph.getNode(this.context.finalNodeId);
    if (!finalNode) return null;

    // For end nodes, make sure we return both inputs and outputs
    // This ensures we capture the actual result data
    if (finalNode.type === "end") {
      return { ...finalNode.inputs, ...finalNode.outputs };
    }

    return { ...finalNode.outputs };
  }

  /**
   * Get the result of a specific node by ID
   * @param nodeId The ID of the node to get results from
   * @returns The node's outputs or null if not found
   */
  getNodeResult(nodeId: string): Record<string, unknown> | null {
    const node = this.graph.getNode(nodeId);
    return node ? { ...node.outputs } : null;
  }

  /**
   * Get the execution trace for debugging or analysis
   * @returns The execution context with all node and edge traces
   */
  getExecutionTrace(): ExecutionContext {
    return { ...this.context };
  }

  /**
   * Get the execution metrics for performance analysis
   * @returns Execution metrics
   */
  getExecutionMetrics(): {
    nodeCount: number;
    edgeCount: number;
    executionTimeMs: number | null;
    status: "running" | "completed" | "failed";
  } {
    return {
      nodeCount: this.context.nodeExecutions.length,
      edgeCount: this.context.edgeTraversals.length,
      executionTimeMs: this.context.endTime
        ? this.context.endTime.getTime() - this.context.startTime.getTime()
        : null,
      status: this.context.status,
    };
  }
}
