import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { FlowMachine, FlowGraph, TaskResolver, Node, Edge } from "./main";

// Setup for mocking fetch API
global.fetch = vi.fn();

describe("FlowMachine", () => {
  let flowMachine: FlowMachine;

  beforeEach(() => {
    flowMachine = new FlowMachine();
    vi.resetAllMocks();

    // Reset fetch mock to avoid test interference
    (global.fetch as any).mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("should create a new FlowMachine instance", () => {
    expect(flowMachine).toBeDefined();
    expect(flowMachine.graph).toBeInstanceOf(FlowGraph);
    expect(flowMachine.taskResolver).toBeInstanceOf(TaskResolver);
  });

  test("should load a flow definition", () => {
    // Setup
    const flowDefinition = {
      nodes: [
        { id: "start", type: "start", inputs: {}, outputs: {} },
        { id: "end", type: "end", inputs: {}, outputs: {} },
      ],
      edges: [{ id: "e1", source: "start", target: "end", conditions: {} }],
    };

    // Execute
    flowMachine.loadFlow(flowDefinition);

    // Assert
    expect(flowMachine.graph.nodes.size).toBe(2);
    expect(flowMachine.graph.edges.size).toBe(1);
    expect(flowMachine.graph.getNode("start")).toBeDefined();
    expect(flowMachine.graph.getNode("end")).toBeDefined();
  });

  test("should run a simple flow with start and end nodes", async () => {
    // Setup
    const flowDefinition = {
      nodes: [
        { id: "start", type: "start", inputs: {}, outputs: {} },
        { id: "end", type: "end", inputs: {}, outputs: {} },
      ],
      edges: [{ id: "e1", source: "start", target: "end", conditions: {} }],
    };

    flowMachine.loadFlow(flowDefinition);

    // Execute
    const context = await flowMachine.run();

    // Assert
    expect(context.status).toBe("completed");
    expect(context.nodeExecutions.length).toBe(2);
    expect(context.edgeTraversals.length).toBe(1);
    expect(context.finalNodeId).toBe("end");
  });

  test("should register and execute task handlers", async () => {
    // Setup
    const mockTaskHandler = vi.fn().mockResolvedValue({ result: "success" });
    flowMachine.taskResolver.registerTask("testTask", mockTaskHandler);

    const flowDefinition = {
      nodes: [
        { id: "start", type: "start", inputs: {}, outputs: {} },
        {
          id: "task",
          type: "testTask",
          inputs: { param: "value" },
          outputs: {},
        },
        { id: "end", type: "end", inputs: {}, outputs: {} },
      ],
      edges: [
        { id: "e1", source: "start", target: "task", conditions: {} },
        { id: "e2", source: "task", target: "end", conditions: {} },
      ],
    };

    flowMachine.loadFlow(flowDefinition);

    // Execute
    await flowMachine.run();

    // Assert
    expect(mockTaskHandler).toHaveBeenCalledTimes(1);
    expect(mockTaskHandler).toHaveBeenCalledWith({ param: "value" });

    // Check that task output was stored
    const taskNode = flowMachine.graph.getNode("task");
    expect(taskNode?.outputs.result).toBe("success");
  });

  test("should evaluate edge conditions correctly", async () => {
    // Setup
    flowMachine.taskResolver.registerTask("branchTask", async () => ({
      status: "success",
    }));

    const flowDefinition = {
      nodes: [
        { id: "start", type: "start", inputs: {}, outputs: {} },
        { id: "branch", type: "branchTask", inputs: {}, outputs: {} },
        { id: "success", type: "end", inputs: {}, outputs: {} },
        { id: "failure", type: "end", inputs: {}, outputs: {} },
      ],
      edges: [
        { id: "e1", source: "start", target: "branch", conditions: {} },
        {
          id: "e2",
          source: "branch",
          target: "success",
          conditions: { status: "success" },
        },
        {
          id: "e3",
          source: "branch",
          target: "failure",
          conditions: { status: "failure" },
        },
      ],
    };

    flowMachine.loadFlow(flowDefinition);

    // Execute
    const context = await flowMachine.run();

    // Assert
    expect(context.nodeExecutions.length).toBe(3); // start -> branch -> success
    expect(context.finalNodeId).toBe("success");
  });

  test("should handle task errors gracefully", async () => {
    // Setup
    const errorMessage = "Test error";
    flowMachine.taskResolver.registerTask("failingTask", async () => {
      throw new Error(errorMessage);
    });

    const flowDefinition = {
      nodes: [
        { id: "start", type: "start", inputs: {}, outputs: {} },
        { id: "fail", type: "failingTask", inputs: {}, outputs: {} },
        { id: "end", type: "end", inputs: {}, outputs: {} },
      ],
      edges: [
        { id: "e1", source: "start", target: "fail", conditions: {} },
        { id: "e2", source: "fail", target: "end", conditions: {} },
      ],
    };

    flowMachine.loadFlow(flowDefinition);

    // Execute & Assert
    await expect(flowMachine.run()).rejects.toThrow(errorMessage);

    // Check that the error was recorded in the context
    const context = flowMachine.getExecutionTrace();
    expect(context.status).toBe("failed");
    expect(context.error?.message).toBe(errorMessage);
  });

  test("should fetch and process data in a multi-step flow", async () => {
    // Setup - Mock fetch response
    const mockData = [
      { id: 1, value: 15 },
      { id: 2, value: 5 },
      { id: 3, value: 20 },
    ];

    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve(mockData),
    });

    // Register task handlers
    flowMachine.taskResolver.registerTask("fetchData", async (inputs) => {
      const data = await fetch(inputs.url as string);
      const json = await data.json();
      return { data: json, success: true };
    });

    flowMachine.taskResolver.registerTask("processData", async (inputs) => {
      const data = inputs.data as any[];
      const processed = data.filter((item) => item.value > 10);
      return { processed };
    });

    // Define flow
    const flowDefinition = {
      nodes: [
        { id: "start", type: "start", inputs: {}, outputs: {} },
        {
          id: "fetch",
          type: "fetchData",
          inputs: { url: "https://example.com/api/data" },
          outputs: {},
        },
        { id: "process", type: "processData", inputs: {}, outputs: {} },
        { id: "end", type: "end", inputs: {}, outputs: {} },
      ],
      edges: [
        { id: "e1", source: "start", target: "fetch", conditions: {} },
        { id: "e2", source: "fetch", target: "process", conditions: {} },
        { id: "e3", source: "process", target: "end", conditions: {} },
      ],
    };

    flowMachine.loadFlow(flowDefinition);

    // Execute
    await flowMachine.run();

    // Assert
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/api/data");

    // Check intermediate results
    const fetchResult = flowMachine.getNodeResult("fetch");
    expect(fetchResult?.data).toEqual(mockData);

    const processResult = flowMachine.getNodeResult("process");
    expect(processResult?.processed).toEqual([
      { id: 1, value: 15 },
      { id: 3, value: 20 },
    ]);

    // Check final result
    const finalResult = flowMachine.getResult();
    expect(finalResult).toHaveProperty("processed");
    expect(Array.isArray(finalResult?.processed)).toBe(true);
    expect((finalResult?.processed as any[]).length).toBe(2);
  });

  test("should preserve data through to end node", async () => {
    // Setup
    flowMachine.taskResolver.registerTask("generateData", async () => ({
      data: { key: "value" },
      timestamp: Date.now(),
    }));

    const flowDefinition = {
      nodes: [
        { id: "start", type: "start", inputs: {}, outputs: {} },
        { id: "generator", type: "generateData", inputs: {}, outputs: {} },
        { id: "end", type: "end", inputs: {}, outputs: {} },
      ],
      edges: [
        { id: "e1", source: "start", target: "generator", conditions: {} },
        { id: "e2", source: "generator", target: "end", conditions: {} },
      ],
    };

    flowMachine.loadFlow(flowDefinition);

    // Execute
    await flowMachine.run();

    // Assert - Final result should contain the data from the generator
    const result = flowMachine.getResult();
    expect(result).toHaveProperty("data");
    expect(result?.data).toEqual({ key: "value" });
    expect(result).toHaveProperty("timestamp");
  });

  test("should track execution metrics correctly", async () => {
    // Setup
    const flowDefinition = {
      nodes: [
        { id: "start", type: "start", inputs: {}, outputs: {} },
        { id: "end", type: "end", inputs: {}, outputs: {} },
      ],
      edges: [{ id: "e1", source: "start", target: "end", conditions: {} }],
    };

    flowMachine.loadFlow(flowDefinition);

    // Execute
    await flowMachine.run();

    // Assert
    const metrics = flowMachine.getExecutionMetrics();
    expect(metrics.nodeCount).toBe(2);
    expect(metrics.edgeCount).toBe(1);
    expect(metrics.status).toBe("completed");
    expect(metrics.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// Test the TaskResolver functionality separately
describe("TaskResolver", () => {
  let taskResolver: TaskResolver;

  beforeEach(() => {
    taskResolver = new TaskResolver();
  });

  test("should register and execute tasks", async () => {
    // Setup
    const mockTask = vi.fn().mockResolvedValue({ result: "success" });
    taskResolver.registerTask("testTask", mockTask);

    const node: Node = {
      id: "test",
      type: "testTask",
      inputs: { param: "value" },
      outputs: {},
    };

    // Execute
    const result = await taskResolver.executeTask(node);

    // Assert
    expect(mockTask).toHaveBeenCalledWith({ param: "value" });
    expect(result).toEqual({ result: "success" });
  });

  test("should throw error for unregistered task types", async () => {
    const node: Node = {
      id: "test",
      type: "unknownTask",
      inputs: {},
      outputs: {},
    };

    await expect(taskResolver.executeTask(node)).rejects.toThrow(
      "No task handler registered for node type: unknownTask",
    );
  });
});

// Test the FlowGraph functionality separately
describe("FlowGraph", () => {
  let flowGraph: FlowGraph;

  beforeEach(() => {
    flowGraph = new FlowGraph();
  });

  test("should add and retrieve nodes", () => {
    const node: Node = {
      id: "test",
      type: "testType",
      inputs: {},
      outputs: {},
    };

    flowGraph.addNode(node);

    expect(flowGraph.getNode("test")).toEqual(node);
  });

  test("should add and retrieve edges", () => {
    const edge: Edge = {
      id: "e1",
      source: "source",
      target: "target",
      conditions: {},
    };

    flowGraph.addEdge(edge);

    expect(flowGraph.edges.get("e1")).toEqual(edge);
  });

  test("should get outgoing edges for a node", () => {
    // Setup
    const edge1: Edge = {
      id: "e1",
      source: "source",
      target: "target1",
      conditions: {},
    };

    const edge2: Edge = {
      id: "e2",
      source: "source",
      target: "target2",
      conditions: {},
    };

    const edge3: Edge = {
      id: "e3",
      source: "other",
      target: "target3",
      conditions: {},
    };

    flowGraph.addEdge(edge1);
    flowGraph.addEdge(edge2);
    flowGraph.addEdge(edge3);

    // Execute
    const outgoingEdges = flowGraph.getOutgoingEdges("source");

    // Assert
    expect(outgoingEdges.length).toBe(2);
    expect(outgoingEdges).toContainEqual(edge1);
    expect(outgoingEdges).toContainEqual(edge2);
    expect(outgoingEdges).not.toContainEqual(edge3);
  });

  test("should get the start node", () => {
    // Setup
    const startNode: Node = {
      id: "start",
      type: "start",
      inputs: {},
      outputs: {},
    };

    const otherNode: Node = {
      id: "other",
      type: "otherType",
      inputs: {},
      outputs: {},
    };

    flowGraph.addNode(startNode);
    flowGraph.addNode(otherNode);

    // Execute & Assert
    expect(flowGraph.getStartNode()).toEqual(startNode);
  });

  test("should get the target node for an edge", () => {
    // Setup
    const targetNode: Node = {
      id: "target",
      type: "testType",
      inputs: {},
      outputs: {},
    };

    const edge: Edge = {
      id: "e1",
      source: "source",
      target: "target",
      conditions: {},
    };

    flowGraph.addNode(targetNode);
    flowGraph.addEdge(edge);

    // Execute & Assert
    expect(flowGraph.getTargetNode("e1")).toEqual(targetNode);
  });
});
