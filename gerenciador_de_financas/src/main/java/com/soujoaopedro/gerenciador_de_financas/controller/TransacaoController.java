package com.soujoaopedro.gerenciador_de_financas.controller;



import com.soujoaopedro.gerenciador_de_financas.dto.TransacaoRequestDTO;
import com.soujoaopedro.gerenciador_de_financas.dto.TransacaoResponseDTO;
import com.soujoaopedro.gerenciador_de_financas.service.TransacaoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transacoes")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000") // Permite que o Next.js se comunique com o Spring
public class TransacaoController {
    private final TransacaoService service;

    //Endpoint que busca as transações através de (GET http://localhost:8080/api/transacoes)
    @GetMapping
    public ResponseEntity<List<TransacaoResponseDTO>> listarTodas(){
        List<TransacaoResponseDTO> lista = service.listarTodas();
        return ResponseEntity.ok(lista); // Retorna um Status 200 OK
    }

    //Endpoint que cria uma nova transação atráves de (POST http://localhost:8080/api/transacoes)
    @PostMapping
    public ResponseEntity<TransacaoResponseDTO> salvar(@RequestBody TransacaoRequestDTO request) {
        TransacaoResponseDTO novaTransacao = service.salvar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(novaTransacao); // Retorna Status 201 Created
    }

    // Endpoint para deletar uma transação (DELETE http://localhost:8080/api/transacoes/{id})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable UUID id) {
        service.deletar(id);
        return ResponseEntity.noContent().build(); // Retorna o Status 204 já que não irá retornar dados
    }

    // Endpoint para atualizar uma transação (PUT http://localhost:8080/api/transacoes/{id})
    @PutMapping("/{id}")
    public ResponseEntity<TransacaoResponseDTO> atualizar(@PathVariable UUID id, @RequestBody TransacaoRequestDTO request) {
        TransacaoResponseDTO atualizada = service.atualizar(id, request);
        return ResponseEntity.ok(atualizada); // Retorna Status 200 OK com o objeto atualizado
    }
}
