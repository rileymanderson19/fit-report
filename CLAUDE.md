# Claude AI

## Overview

Claude is a family of large language models developed by Anthropic. Designed with a focus on safety, reliability, and helpfulness, Claude excels at a wide range of tasks including analysis, coding, creative writing, and complex problem-solving.

## Current Models

### Claude Opus 4.5
- **Model ID**: `claude-opus-4-5-20251101`
- **Tier**: Flagship model
- **Best for**: Most complex tasks requiring advanced reasoning and analysis

### Claude Sonnet 4.5
- **Model ID**: `claude-sonnet-4-5-20250929`
- **Tier**: Balanced performance
- **Best for**: Most daily tasks with optimal balance of capability and speed

### Claude Haiku
- **Tier**: Fast and efficient
- **Best for**: Quick tasks, rapid responses, and cost-sensitive applications

## Key Capabilities

### 1. Analysis & Reasoning
- Deep analytical thinking with complex problem decomposition
- Multi-step reasoning across technical and abstract domains
- Pattern recognition and insight generation

### 2. Code Development
- Multi-language programming support
- Code review, debugging, and optimization
- Architecture design and refactoring
- Test generation and documentation

### 3. Document Understanding
- Analysis of long documents (up to 200k tokens)
- Cross-document synthesis
- Technical documentation comprehension

### 4. Creative & Technical Writing
- Clear, contextually appropriate communication
- Technical documentation and API references
- Content generation across formats

## Best Practices

### Effective Prompting

1. **Be Specific**: Provide clear context and requirements
   ```
   Good: "Refactor this function to use async/await and add error handling"
   Poor: "Make this better"
   ```

2. **Break Down Complex Tasks**: Divide large projects into manageable steps

3. **Provide Examples**: Show desired output formats or patterns

4. **Iterate**: Refine requests based on initial results

### Working with Code

- **Show existing code** before requesting changes
- **Specify constraints** (performance, compatibility, style)
- **Request explanations** when learning new concepts
- **Ask for tests** to validate functionality

### Context Management

- Reference specific files, functions, or line numbers
- Provide error messages in full
- Share relevant configuration details

### Workflow Orchestration

#### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

#### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

#### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

#### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

#### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

#### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

### Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

### Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Limitations

- **Knowledge Cutoff**: Training data through January 2025
- **No Internet Access**: Cannot fetch real-time information (without tools)
- **No Memory Between Sessions**: Each conversation starts fresh
- **Cannot Execute Code Directly**: Relies on tools for execution

## Use Cases

### Software Development
- Feature implementation
- Bug investigation and fixing
- Code review and refactoring
- Test writing
- Documentation generation

### Data Analysis
- Log analysis
- Pattern identification
- Data transformation
- Report generation

### Learning & Education
- Concept explanation
- Code walkthroughs
- Best practice guidance
- Architecture discussions

### Planning & Design
- System architecture design
- API design
- Database schema planning
- Project scaffolding

## Claude Code CLI

When using Claude through the Claude Code CLI:

- **Tools Available**: File operations, bash execution, web search, and more
- **Context Aware**: Can read your codebase and git history
- **Interactive**: Can ask clarifying questions
- **Task Management**: Tracks complex multi-step operations

### Common Commands

```bash
# Start a session
claude

# Get help
/help

# Clear conversation
/clear
```

## Tips for Success

1. **Start with exploration**: Let Claude understand your codebase first
2. **Review suggestions**: Claude provides guidance, but you make final decisions
3. **Provide feedback**: Clarify when outputs don't meet expectations
4. **Use iteratively**: Refine and build upon previous responses
5. **Leverage strengths**: Use Claude for analysis, planning, and implementation

## Resources

- **Anthropic Website**: [anthropic.com](https://anthropic.com)
- **API Documentation**: [docs.anthropic.com](https://docs.anthropic.com)
- **Claude Code GitHub**: [github.com/anthropics/claude-code](https://github.com/anthropics/claude-code)

---

*Last Updated: January 2026*
